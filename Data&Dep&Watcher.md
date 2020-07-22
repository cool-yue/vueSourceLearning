Data也称为state，个人感觉是vue的灵魂，vue是数据驱动的框架，那么data这一块基本承担了大部分的操作，同时data的操作也伴随着`Dep`，`Observer`，`Watcher`，这3个对象，对于data初始化到最后修改某个state导致视图变化，这个过程下面通过源码来分析。
## InitData ##

    let data = vm.$options.data
	      data = vm._data = typeof data === 'function'
	    ? getData(data, vm)
	    : data || {}

    // 这里省略了data的验证的操作，比如验证是否是保留属性，比如是否跟props和methods重名
    proxy(vm, `_data`, key)
    observe(data, true /* asRootData */)

以上代码很清晰，就是拿到data选项后，一般情况下是函数，因此会执行`getData（data，vm)`，这里注意一点为什么专门定义一个方法来`getData（）`，原因是有时候`data() {return {aaa:this.aaa}}`,这个`this`的上下文需要是当前的示例，由于options和vm属于2个对象，这里要到`vm`的上下文去取一些属性。因此这里需要把`vm`传入，作为上下文的形式给`data`函数。

    // getData里面的内容
    return data.call(vm)

取到的data对象放到`vm._data`中，然后做一个代理，这个代理的作用就是，比如`this.aaa`会去取`vm._data.aaa`，这就是为什么data是个函数,它返回是一个对象，并且放进的是`_data`中，但是能够通过`this.xxx`去访问。最后一步就是传说中的响应式定义，observer。
    
    ob = value.__ob__
    ob = new Observer(value)

obeserver的方法，基本上就执行了上面2个事，在value上面创建一个data，这里value为`data（）`返回的对象，下面看看new Observer做了什么。

    this.value = value
    this.dep = new Dep()
    this.vmCount = 0  
    def(value, '__ob__', this)
    this.walk(value)

    walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]])
     }
    }

如上面代码所示，ob对象放进了data函数生成的对象中，然后为ob对象创建了一个dep，vmCount设置为0，这里使用了`def（）`，使用def的原因就是为了让这个属性不可枚举，这样比较好的保护这个属性。最后一个方法，walk相当于遍历这个data函数返回的对象，最后对于每个属性值，进行响应式数据的定义。`defineReactive`为定义响应式数据，下面看看这个方法到底做了什么。第一个参数为data对象，第二个参数为key,第三个值为value.

    const dep = new Dep();
    
    Object.defineProperty(obj,key,{
	    enumerable:true,
	    configurable:true,
	    get:reactiveGetter,
	    set:reactiveSetter
    })
    
    function reactiveGetter () { 
    	const value = getter ? getter.call(obj) : val
    	if (Dep.target) { 
    		dep.depend()
    	}
    	return value
    }
    
    function reactiveSetter(newValue) {
    	const value = getter ? getter.call(obj) : val
    	if (newVal === value || (newVal !== newVal && value !== value)) {
    		return;
    	}
    	val = newVal
    	dep.notify()
    }

如上所示，定义响应式首先定义一个与属性一一对应的dep对象，然后定义相应的set和get，set会比较是否与旧值一样，如果一样就什么也不做，如果不一样那么就`dep.notify()`。get的逻辑就是如果当前`Dep.target`存在，那么就`dep.depend()`。下面看看`notify`和`depend`做了什么，先分析depend再来分析notify。

#什么时候进行依赖收集#
depend会在触发这个属性的get后触发，那么什么时候触发呢？答案是在render执行的时候，这样做有个好处就是，它只会收集视图有依赖的对象，比如render函数是下面这样的

    render(h) {
       return h('aaa',{props:{"abc":this.aaa}},["aaa"])
    }
    <aaa :abc="aaa">aaa</aaa>

这个`this.aaa`就是视图的依赖，该视图会渲染成后面的代码那样，要执行这个函数，必须要访问`this.aaa`,因此触发了`aaa属性`的`get`，现在的问题是`Dep.target`是什么呢？这个是`vue-component`的`_watcher`,视图渲染的时机是在`mountComponent`方法中执行，具体看源码，在`mountComponent`的最后，会`_watcher = new Watcher(vm,updateComponent)`,

    function mountComponent() {
    	updateComponent = () => {
      		vm._update(vm._render(), hydrating)
    	}
    	vm._watcher = new Watcher(vm, updateComponent, noop);
    	return vm
    }

这个`updateCompnent`会放在`watcher`的`get`方法中执行，来看看`Watcher`实例化的过程：

     constructor (
        vm: Component,
        expOrFn: string | Function,
        cb: Function,
        options?: Object
     ) {
       this.vm = vm
       vm._watchers.push(this)
       this.id = ++uid
       this.active = true
       this.deps = []
       this.newDeps = []
       this.depIds = new Set()
       this.newDepIds = new Set()

       if (typeof expOrFn === 'function') {
         // 如果传入的数是函数则把expOrFn赋值给getter
         this.getter = expOrFn
       } 
       this.value = this.lazy? undefined: this.get();

上面是`watcher`的构造函数，初始化了一些属性，将第二个参数作为`this.getter`,初始化完成后最后将`this.value = this.get()`。下面来看看get里面做了什么。

    get () {
    
	    pushTarget(this)
	    const vm = this.vm
	    value = this.getter.call(vm, vm)
	    popTarget()
	    this.cleanupDeps()
    
    	return value
    }

首先`pushTarget`将当前的`watcher`设置为`Dep.target`,然后拿到`watcher`被绑定到的`vm`,然后以`vm`作为上下文来执行`getter`，这个`getter`就是`updateComponent`

   `vm._update(vm._render(), hydrating)`

`updateComponent`会执行`vm._render()`,然后运行`_update`。`render`会生成`vnode`，通过调用`render`函数，而这时`render`的上下文是`vm`，因此`render`中取属性会在`vm`上下文中取，而前面`initState`已经将模板依赖的属性进行了`defineReactive`，于是触发了属性的`get`，由于当前`Dep.target`为`vm`的`_watcher`,因此dep的依赖收集。

    dep.depend()
    depend () {
    	if (Dep.target) {
      		Dep.target.addDep(this)
    	}
      }

上面的方法是dep的`depend`方法，因此`this`表示`dep对象`，`Dep.target`是`watcher`，因此`addDep`为`watcher`的方法，下面看看这个方法做了什么。

      addDep (dep: Dep) {
    	const id = dep.id
    	if (!this.newDepIds.has(id)) {
      		this.newDepIds.add(id)
      		this.newDeps.push(dep)
      		if (!this.depIds.has(id)) {
    		dep.addSub(this)
      		}
    	}
      }

      addSub (sub: Watcher) {
        this.subs.push(sub)
      }

以上代码拿到`dep.id`，如果`newDepIds`没有这个`id`，将这个`id`加入到`newDepsId`中，同时将`dep`压入到`newDeps`中，如果`depIds`也没有这个`id`，那么就把`watcher`对象放入`dep`的`subs`中，这样依赖就被收集到了`watcher`的`newDeps`中，这里执行完成后，依赖收集完成，下一个就是`popTarget()`，这个`popTarget`就是把前一个`Target`放在当前的`target`上面，这么做的意思是针对计算属性，因为计算属性有一个自己的`computedWatcher`，`computedWatcher`会收集依赖，修改依赖的值后，由于`computed`对于性能的优化，默认是`lazy`模式，只有在依赖的值为dirty的时候，才会去执行，`computedWatcher`只是将dirty修改为true。收集依赖的过程依旧是在访问计算属性的时候开始，计算属性的getter也是去执行wathcer的getter，这个阶段存在Dep.target的切换，先执行`computedWatcher`读取值，然后收集依赖，然后`popTarget`之后，当前的target为视图的wathcer，视图的watcher也会去收集相同的依赖，所以这就是为什么，计算属性的依赖改了，视图也会更新的原因。下面是相关的代码：

    function pushTarget (_target: Watcher) {
      if (Dep.target) targetStack.push(Dep.target)
      Dep.target = _target
    }
    
    function popTarget () {
      Dep.target = targetStack.pop()
    }

对于普通的data属性的depend依赖就非常直观了，直接就是当前的视图watcher去收集。最后去看看`this.cleanupDeps()`这句话做了什么

    let i = this.deps.length
    while (i--) {
      // 遍历deps中的每个元素,如果newDepIds中没有dep对象中的id
      // 就去当前dep对象中,清理当前的移除watcher实例
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
    	dep.removeSub(this)
      }
    }
    
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0

通过上面的代码可知道，`cleanupDeps()`为清理wathcer的操作，逻辑就是在已收集的依赖列表中跟新的依赖列表不一样的时候，把上一次收集的id在新收集的id中不存在的id对应的dep进行watcher的移除。例如

<pre>
第一次依赖为a,b,c
第二次依赖为a,b
第二次发现依赖c相当于第一次，第二次没收集，因此可以认为c已经不是当前视图的依赖了
于是在c的dep的subs数组中移除当前的wathcer对象。
随后进行新老dep的互换，新老depsId的互换。
这一步非常有必要因为，watcher的有效收集能够避免不必要的watcher的回调的执行，释放之后，也能节约一定的内存，提高性能。
</pre>

当将依赖的值进行修改的时候，会执行notify，下面来看看notify的操作。

     notify () {
    	// stabilize the subscriber list first
    	const subs = this.subs.slice()
    	for (let i = 0, l = subs.length; i < l; i++) {
      		subs[i].update()
    	}
      }

notify调用的条件就是当依赖发生变化的时候，这个时候会通知各个watcher去执行相关的回调，可能是计算属性，可能是watch选项，可能是视图watcher。

      update () {
    	/* istanbul ignore else */
    	if (this.lazy) {
      		this.dirty = true
    	} else if (this.sync) {
      		this.run()
    	} else {
      		queueWatcher(this)
    	}
      }

以上为update的代码，可以知道，lazy为true的时候，表示是`计算属性`的依赖进行了修改，如果设置了sync那么会同步去更新视图，其余情况`queueWatcher(this)`会把`watcher`放入一个队列中，在下一个tick中运行，vue通过`Promise.resolve().then`来将这些`watcher.run`放到`MicroTask`中，来进行更新。现在来看看`run`做了什么。

    run() {
    	const value = this.get()
    	this.cb.call(this.vm, value, oldValue)
    }

run中的逻辑就是运行get，如果有cb就运行cb,没有cb就不运行，这个是针对watch选项的回调的。由于get函数上面有讲到，这里不再提及，get负责的功能基本上包括了视图更新，新鲜值的获取，已经新的依赖的收集和不存在的依赖的销毁。下面看看cb是怎么定义的，cb只有watch选项才有，这个具体看watch的初始化。对于watch选项由于类似于下面这种形式：

       watch：{
       		xxx:function(newV,odlV) {}
       }

这里watch的初始化会将function设置为wathcer实例的第三个参数，作为cb，而第二参数，可以是a.b.c或者function（） {return this.a + this.b}这种类型，不论是哪种，a.b.c会解析成function() {return vm.a.b.c}形成这样一个函数,如果是函数的话，就跟计算属性类似，只不过比计算属性多了一个cb，那个cb会在取值之后运行。