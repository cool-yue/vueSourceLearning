diff算法是程序上最小化的更新，它抛弃了严格地层次遍历，而是选择了几种情况，这样就把一次的复杂度转从n转化成了1，比如n个节点对比，取出新的节点，然后与旧的每一个都去做循环比对，这个复杂度是n，取而代之的是头头，头尾，尾头，尾尾的4种情况的比较，当这4种情况不满足的时候，最后根据key是否存在进行高效更新，如果key不存在就创建一个新的节点。下面来分析一下vue中的patchVnode的逻辑。


当修改某个响应数据的时候，视图会重新渲染，这个过程基本上是vue的核心功能之一，由于在初始化在用户定义的options上进行加工，将对应的数据处理为响应数据，定义了一套get和set的方法，get用于收集依赖，set的用于通知变化产生，从而渲染视图去更新，下面总结一下这个更新的过程。首先假定一个挂载好的模板如下：

    // 父组件
    <div><abc :aaa="bbb"><div>aaa</div></abc></div>
    data:{bbb:"bbb"}
    // 子组件abc
    <div>{{aaa}}<div><slot></slot></div></div>
    props:{aaa:String}
    
假定上面的模板已经渲染好了，在父上下文中执行下列操作。

    this.bbb = "changed"

这里触发了bbb的set行为：

    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 如果不是浅的,就继续观察这个新的值,为他生成一个observer对象
      childOb = !shallow && observe(newVal)
      // 通知发生了改变
      dep.notify()
    }

通过上面的代码，可以看到vue判断值是否改动使用的是`newVal === value`，如果`shallow`传入的是`false`，就是非浅状态，同时值为对象的情况下，还会深入进行内部属性的响应式处理，默认是非浅的，所以会深入遍历，一层一层递归，去将数据进行依赖的绑定。最终执行`dep.notify()`，下面看看`notify`做了什么。

      notify () {
    	// stabilize the subscriber list first
    	const subs = this.subs.slice()
    	for (let i = 0, l = subs.length; i < l; i++) {
      		subs[i].update()
    	}
      }

notify的逻辑非常简单就是循环遍历，该属性的set函数闭包环境中的dep的`notify`方法，这个`notify`方法就是遍历`dep`对象的`subs`属性，这个`subs`里面装有依赖这个属性的`watcher`，因此调用他们进行`update（）`，根据上面定义的渲染模板，可以知道`bbb`属性属于`data`属性里面的，`data`属性会被收集到`vm._watcher`,作为`render watcher`，即作为渲染视图的`wathcer`，这里的`vm`就是上面模板的父组件对象，所以当前这里就是`vm._watcher`调用`update`，下面看看`update`的过程：

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

由于`watcher`存在复用，所以这里有2种情况，带lazy的代表的是计算属性，设置了`sync`为`true`，代表的是同步，那么会立即执行`run`，通常情况下这里不会设置`sync`，所以这里会执行`queueWatcher（this）`，`this`这里代表当前的`wathcer`，也就是父组件的`render watcher`，下面先看看`queueWatcher`后面可能会用到的变量。

    let waiting = false
    let flushing = false
    let index = 0
    let has: { [key: number]: ?true } = {}
    let circular: { [key: number]: number } = {}v
    const queue: Array<Watcher> = []
    const activatedChildren: Array<Component> = []

初始化的时候，上面这些变量进行了初值初始化，其中`waiting===flushing===false`，`index===0`，`queue`是一个装有`watcher`的数组。下面看看`queueWatcher`的逻辑：

    function queueWatcher (watcher: Watcher) {
      const id = watcher.id
      if (has[id] == null) {
    	has[id] = true
    	if (!flushing) {
      		queue.push(watcher)
    	} else {
      		// if already flushing, splice the watcher based on its id
      		// if already past its id, it will be run next immediately.
      	 let i = queue.length - 1
      	 while (i > index && queue[i].id > watcher.id) {
    	 i--
      }
      queue.splice(i + 1, 0, watcher)
    }
      // queue the flush
	  if (!waiting) {
	    waiting = true
	    nextTick(flushSchedulerQueue)
	  }
    }
    }

如上代码，首先拿到`wathcer`的`id`，注意同一个`vm`中`watcher`的`id`是通过顺序是，`computed` < `user watch` < `render watcher`,这么定义是有道理的，因为`user watcher`可能会去观察计算属性，比如当修改一个计算属性依赖的属性`a`的时候，由于计算属性先初始化所以`computed watcher`最早出现在`a`的对应的`dep`的`subs`中，因此`computed watcher`会去把`dirty`设置为`true`，然后才是`a`的`subs`中的`user watcher`,正是由于`computed watcher`把`dirty`改为了`true`之后，`user watcher`才能去get到新值，从而触发回调，最终执行的是`render watcher`，之所以在这个时候可以执行是因为前面已已经具备了将新值拿到的条件了（dirty变为true后，才会重新计算新值，如果这个新值都没计算出来就去渲染模板，那重新渲染模板无任何意义），由于`watcher`的`init`的过程，伴随着一个自增长的数字，因此越先`init`的越小，越后的越大。

拿到`watcher`的`id`之后，会先判断`has`这个`类set`中有没有这个`watcher`，如果有，就不放入，这样防止同一个watcher反复执行。然后判断是否需要`waiting`，如果为`false`，表示当前不需要等待,完全有条件可以开始`patch`，所以会运行如下代码，将`waiting`设置为`true`。


     if (!waiting) {
    	waiting = true
    	nextTick(flushSchedulerQueue)
     }

把`waiting`设置为`true`，表示已经在`flushingQueue`了，在`flushing`没完成之前，不会再执行`flushSchedulerQueue`，同时把`flushSchedulerQueue`放进`nextTick`，也就是在同步代码运行完之后，开始清理`queue`，下面看`flushSchedulerQueue`的逻辑。

      flushing = true
      let watcher, id

将`flushing`标志位设置为`true`，这样防止后面添加`watcher`的时候，不仅仅是简单的`push`，而是通过`id`来正确地插入到`queue`正确的位置，这个细节如前面说到的。

      // Sort queue before flush.
      // This ensures that:
      // 1. Components are updated from parent to child. (because parent is always
      //created before the child)
      // 2. A component's user watchers are run before its render watcher (because
      //user watchers are created before the render watcher)
      // 3. If a component is destroyed during a parent component's watcher run,
      //its watchers can be skipped.

      // 关于第三点，这里要解释下，为什么按照顺序可以跳过destroyed的wathcer，比如[w1,w3,w2],如果按照初始顺序的话，如果是这样的话
      // 在w1是w2的父上下文，w2是w3的父上下文
      // 假如w2里面的操作是让w3隐藏，那么按照这个顺序的话，w1run一次更新，w3更新一次，最后w2把w3更新的又给destroyed了
      // 如果[w1,w2,w3],运行到w2的时候，由于w2里面让w3销毁，因此active字段会变成false，因此在w3运行的时候，由于active为false
      // 这样就不会执行w3里面run的具体方法
      
      queue.sort((a, b) => a.id - b.id)
排序，这里前提提到过其重要性，
      
      for (index = 0; index < queue.length; index++) {
    	watcher = queue[index]
    	id = watcher.id
    	has[id] = null
    	watcher.run()
    }
然后按照排好序的`queue`一个一个去执行`run`方法。这里有一个判断无限递归的方式，就是当同一个`watcher`跑了100次之后，会给出无限递归的警告。

    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
    	warn(
      'You may have an infinite update loop ' + (
    	watcher.user
      ? `in watcher with expression "${watcher.expression}"`
      : `in a component render function.`
      ),
      watcher.vm
    )
    break
      }
    }

从这里开始就循环去清理这个queue了，回到之前提到的修改的 `this.bbb = "changed"`,由于`bbb`属于`data`，它会触发`renderWatcher`，所以现在开始执行`watcher`的`run`方法。

    run () { 
    	const value = this.get()
    }

对于`render watcher`只会运行这里，这个get（）方法就是`updateComponent`
    
    updateComponent = () => {
      vm._update(vm._render(), hydrating)
    }

`vm`先通过`render`去生成`vnode`对象，作为新的`vnode`，然后`_update()`.

    const vm: Component = this
    if (vm._isMounted) {
      callHook(vm, 'beforeUpdate')
    }

首先触发一个`beforeUpdate`的钩子函数，然后开始切换上下文了以及存放新老节点。

    const prevEl = vm.$el
    const prevVnode = vm._vnode
    const prevActiveInstance = activeInstance
    activeInstance = vm
    vm._vnode = vnode

`vm.$el`为老的dom，`vm._vnode`为老的`vnode`，`activeInstance`为上一个组件实例的上下文，vm为当前实例上下文，因此将    `prevActiveInstance = activeInstance，activeInstance = vm`，将新生成的节点赋值给`vm._vnode`,注意`_vnode`是`render`生成的`vnode`，然后开始`patch`。

    vm.$el = vm.__patch__(prevVnode, vnode)
    activeInstance = prevActiveInstance

这个方法就是更新dom的方法，更新完成后，切换上下文。下面看看`__patch__`做了什么工作。在web环境中,`__patch__`就是`patch`.

    Vue.prototype.__patch__ = patch;

针对上面提到的情景，组件已经挂载，在修改某个响应属性的时候，通过对比新旧vnode来进行dom的更新，所以在patch中主要运行这一句话。

    patchVnode(oldVnode, vnode, insertedVnodeQueue, removeOnly)
    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
    return vnode.elm

这句话运行完了，就表示2个节点更新完了，然后调用`insertHook`，`insertHook`主要做下面这些工作，如果是`isInitialPatch`，那么就会调用`mounted`的钩子，如果已经`mouted`，会去处理`keepAlive`的情况，最后返回更新好的`dom`。下面着重分析`patchVnode`做了什么。
## patchVnode ##
通常在更新的时候,会是这样形式的调用,`patch(oldVode,vode)`,下面来分析里面的逻辑,如果`oldVnode === vnode`，那么就不用更新。

    if (oldVnode === vnode) {
      return
    }
针对前面举的例子，例子中对应的`vnode`的形式如下面这样:

    // 父组件
    <div><abc :aaa="bbb"><div>aaa</div></abc></div>
    data:{bbb:"bbb"}
    
    {tag:"div",children:[{
                     tag:'vue-component-1-abc',
                     componentInstance
                     componentInstanceOptions:{Ctor,propsData:{aaa:"bbb"},children:[{tag:"div",children:[textVnode]}]}
                 }]}


    // 子组件abc
    <div>{{aaa}}<div><slot></slot></div></div>
    props:{aaa:String}


    // 新版本的为下面
    {tag:"div",children:[{
                     tag:'vue-component-1-abc',
                     componentInstance
                     componentInstanceOptions:{Ctor,propsData:{aaa:"changed"},children:[{tag:"div",children:[textVnode]}]}
                 }]}




如果它们不相等，那么就要玩真的了，开始比对了，但是首先要做一系列准备工作。

    const elm = vnode.elm = oldVnode.elm

拿到old的elm，因为在patch的时候，vnode的elm还没生成，vnode的elm需要通过diff算法，在oldVnode.elm的基础上去增量更新，这样就能优化性能，而不是完全重新创建，所以初始化让vnode.elm = oldVnode.elm,这样由于elm属于对象，在oldVnode.elm上面修改，那么vnode.elm引用同样的elm，因此vnode.elm上也会得到相应的更新。

    isTrue(oldVnode.isAsyncPlaceholder) // 这里是处理异步占位符,这里先不管
    
    // 这里是静态组件判断，静态组件可以认为视图不会再更新了
    // 所以只需要把oldVnode上面的组件给vnode.componentInstance
    isTrue(vnode.isStatic) && isTrue(oldVnode.isStatic) && vnode.key === oldVnode.key && (isTrue(vnode.isCloned) || isTrue(vnode.isOnce) {
         vnode.componentInstance = oldVnode.componentInstance
         return
    }
如果上面的条件都不满足，那么拿到`vnode.data`,判断data中有没有prepatch的hook，如果有就运行`prepatch（oldVnode，vnode）`，针对上面的vnode，由于最外层是个`div`标签，属于`html`原生标签，这里在生成`vnode`的时候，并不会有`data.hook.prepatch`，因此这里会跳过。

    let i
    const data = vnode.data
    if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
    	i(oldVnode, vnode)
    }
跳过后，会取到`children`。

    const oldCh = oldVnode.children
    const ch = vnode.children

按照上面的`vnode`结构，children为`["vue-component-1-abc"]`,更新最外层的dom，这里cbs中有7个，都是基于dom存在的,`isPatchable(vnode)`会拿到从根节点开始，最近的一个原生html元素tag的节点，它会修改vnode的值，而这里vnode就是根节点，因为根节点是`div`。

    // attrs,class,dom-props,events,style,transition,ref,directive
    if (isDef(data) && isPatchable(vnode)) { 
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode) {
       if (isDef(i = data.hook) && isDef(i = i.update)) i(oldVnode, vnode)
      }
    }
运行完之后，开始更新chidren了，上面已经拿到oldCh和ch了，下面开始进行ch的patch，会运行下面这句话

    if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)

## updateChildren ##
updateChildren就是典型的diff比较过程,具体看源码的注释，主要运行下面这个分支

    patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue)

这里相当于递归地执行patchVnode，现在的Vnode已经变成了`"vue-component-1-abc"`,下面来继续看`vue-component-1-abc`的执行会有`prepatch`的过程，因为它不是原生的`html`标签，在创建`vnode`的时候，需要创建实例，同时在实例上面绑定hook。

     if (oldVnode === vnode) {
      return
     }
     const elm = vnode.elm = oldVnode.elm
     const data = vnode.data
     if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) { 
     	i(oldVnode, vnode)
     }

顾名思义这里是预更新,并且针对的是`vue-component`的情况,根组件不算，可以认为这里处理的是除了根组件外的`vue-component`，比如`<abc></abc>`,在创建abc的`vnode`的时候会变成`vue-component-cid-abc`,并且在data中并入这个`prepatch`的`hook`，那么看看`prePatch`做了什么。

      prepatch (oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
		    /* componentOptions中拥有以下几个属性
		      Ctor: ƒ VueComponent(options)
		      children: undefined
		      listeners: undefined
		      propsData: undefined
		      tag: "def"
		    */
		    // 把新的componentOptions赋值给options
		    // 把old的componentInstance 给新的,同时赋值给一个child
		    const options = vnode.componentOptions
		    const child = vnode.componentInstance = oldVnode.componentInstance
		    // child是一个vm
		    updateChildComponent(
		      child,
		      options.propsData, // updated props
		      options.listeners, // updated listeners
		      vnode, // new parent vnode
		      options.children // new children
		    )
      }

之所以要做这个`prePatch`的原因是,这是vue组件实例的一些属性的覆盖，如果只是单纯的vnode，vnode上面的属性就足够反映当前组件的所有状态，而vue-component的组件，严格来讲它是依靠js对象来进行交互的，真正的dom实际上是对象options上面的render，而listener这些都需要放在vue对象上面，因此这个prepatch就是针对vue实例，用新的属性值覆盖掉旧的属性值。

正是因为有实例，{Ctor,propsData,listener,tag,children},这里面的几个属性是普通dom元素不具备的，严格来收这些是vm对象存在的属性，并且里面的属性值，会影响最终dom的效果，因此它的信息需要以赋值的形式去更新，这几个属性，比如children换了，比如propsData里面的值换了，那么最后的视图是不一样的，同时新的vnode创建了，显然不应该再以新的vnode去创建instance，这样就没有diff的意义了，现在的问题是，在通过_render创建了新的Vnode的时候，实际上通过模板的解析已经把props，children，listener这些变化给放入了新生成的vnode.componentOptions中了，这些只有vue-component才具备这些东西,所以vnode.ComponentOptions里面存有更新后的propsData,listener,children。

    const options = vnode.componentOptions
    const child = vnode.componentInstance = oldVnode.componentInstance

然后updateChildComponent，

    updateChildComponent(
    		  child,
    		  options.propsData, // updated props
    		  options.listeners, // updated listeners
    		  vnode, // new parent vnode
    		  options.children // new children
    		)
这5个属性，很清晰，下面看看具体更新。由于vm实例已经存在了，所以就不必要再次创建实例了，直接在已经创建的实例上面覆盖属性。


    // 覆盖父节点占位符
    vm.$options._parentVnode = parentVnode
    vm.$vnode = parentVnode
    if (vm._vnode) { 
       vm._vnode.parent = parentVnode
    }
    
    // 拿到新的children
    vm.$options._renderChildren = renderChildren
    
    // 拿到新的attrs
    vm.$attrs = parentVnode.data && parentVnode.data.attrs
    
    // 拿到新的listeners
    vm.$listeners = listeners
    
    // 处理props,这里依旧需要validateProps
    if (propsData && vm.$options.props) {
    	observerState.shouldConvert = false
    	const props = vm._props
    	const propKeys = vm.$options._propKeys || []
    	for (let i = 0; i < propKeys.length; i++) {
      		const key = propKeys[i]
      		props[key] = validateProp(key, vm.$options.props, propsData, vm)
    	}
    	observerState.shouldConvert = true
    	// keep a copy of raw propsData
    	vm.$options.propsData = propsData
    }
    
    // 更新listener
    // 针对新的listener对象和老的对象
    // 来进行listener的对象合并，新的覆盖久的
    if (listeners) {
        const oldListeners = vm.$options._parentListeners
        vm.$options._parentListeners = listeners
    	updateComponentListeners(vm, listeners, oldListeners)
    }
    
    // 更新vm.$slot对象，然后强制vm的视图watcher进行update视图
    if (hasChildren) {
    	vm.$slots = resolveSlots(renderChildren, parentVnode.context)
    	vm.$forceUpdate()
    }
总结上面的updateChildComponent基本上就是在已经存在的vm实例上面，来更新这些属于instance的一些属性。vnode现在已经是新版本的了，vm的实例也更新了，主要是更新$options里面的属性。这里需要注意的是，修改props或者slot的渲染，也就是解析出了存在renderChildren的情况下，按照上面的`this.bbb="changed"`，`props[key] = validateProp(key, vm.$options.props, propsData, vm)`这句话触发了abc组件实例的render watcher的update
    
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

以上update的代码。lazy是针对计算属性的，sync字段是同步，一般情况下不会设置sync，所以会运行`queueWatcher(this)`,也就是把这个`watcher`压入到`queue`中，注意的是，这里的过程是，父组件的run方法还没执行完，在执行的过程中，将子组件的watcher压入了queue中，flushQueue的的循环执行中，又放入了一个待执行的render watcher，所以这里这个循环遍历flush queue的长度又增加了，依次进行下来，比如当下一个watcher执行的时候，可能还会引入新的wathcer，那么queue队列又会追加一个进去，以此不停地追加下去，直到没有触发新的render watcher位置，另一方面，在收集新的render watcher的时候，会充分考虑到watcher的id，将id以正确的顺序插入，而不是简单的push，这样的好处在于，顺序一致，比如组件a,id为1里面有组件b，id为2，b组件后面是组件c，id为5，在b组件的watcher执行的时候，引入了新的组件d，id为4，由于目前在更新组件b，而d从属于d，因为vue的组件是按照深度优先来渲染的，因此渲染d相当于渲染b的一部分，因此b需要放在c的前面来执行，所以这个时候就需要通过id来找准watcher的顺序，这样在渲染的时候，才更加符合先后的顺序。

    // 某一时刻flashqueue的状态，
    flashQueue: [a(1),b(2),c(5)]
    // a运行完毕后，开始运行b,由于b存在子组件，且触发了子组件d的props或者子组件有slot
    flashQueue：[b(2,执行中),c(5)],d(4)需要加入到queue中
    // 通过d组件的id为4，来插入到queue中正确的位置
    flashQueue :[b(2,执行中),d(4),c(5)]
    // b执行完后,运行d（4）
    flashQueue：[d(4 运行中),c(5)]
    // 假定d(4)并没有引入新的render watcher
    flashQueue:[c(5)]
    // 最后c(5)执行,假定没有引入新的watcher，那么queueflash完毕
    flashQueue:[]
回到前面，`queueWatcher(this)`这句话会执行下面这些逻辑


      const id = watcher.id
      if (has[id] == null) {
    	has[id] = true
    	if (!flushing) {
      		queue.push(watcher)
    	} else {
      		// if already flushing, splice the watcher based on its id
      		// if already past its id, it will be run next immediately.
      	 let i = queue.length - 1
      	 while (i > index && queue[i].id > watcher.id) {
    	 i--
      }
      queue.splice(i + 1, 0, watcher)
    }

现在是执行abc的父组件的run的过程中，更新abc的时候，触发了abc组件的render watcher，由于这个操作是父组件连带触发了子组件abc，相当于父组件的run还没有运行完，所以这里flushing已经是true了，表示这是新添加的watcher，需要插入到queue中合适的位置，那么会从后面遍历queue队里，将abc的watcher插入到合适的位置。这里还要提到的是，由于存在slot的渲染，所以下面代码还会继续触发update

    if (hasChildren) {
    	vm.$slots = resolveSlots(renderChildren, parentVnode.context)
    	vm.$forceUpdate()
    }
但是由于`if (has[id] == null)`这个条件，由于abc的render watcher已经被压入了queue因此，这里只会添加一次watcher。在prepatch运行完后，继续在拿到children，对于`vue-component-1-abc`，它是没有children的，它的真实children，被放入了componentInstanceOptions中的children中了，因此后面有更新children的过程，只会执行下面的内容：
    
    
    if (isDef(data) && isPatchable(vnode)) { 
    	for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode)
    	if (isDef(i = data.hook) && isDef(i = i.update)) i(oldVnode, vnode)
    }
    
    比如上面给的abc的模板是：
    <div>{{aaa}}<div><slot></slot></div></div>
    props:{aaa:String}

这句话的逻辑就是在abc中的`<div>`上面加入这些dom属性。方法是循环循环遍历：

     while (vnode.componentInstance) {
       vnode = vnode.componentInstance._vnode
     }
     return isDef(vnode.tag)

就是拿到最靠近根的原生html元素，vnode存在componentInstance就不是原生tag，没有instance同时tag定义了，那么就是原生html标签。更新完基于dom的属性后，那么abc的更新完成。由于按照上面定义的模板，只有abc一个children，因此父组件也更新完毕，运行到这里只表示父组件的render watcher的run执行完毕，下面继续循环queue，发现queue里面还有abc的render watcher，因此开始更新执行abc的render watcher的run方法。还是执行以下代码：

    const value = this.get()
    // get为updateComponent
    updateComponent = () => {
       vm._update(vm._render(), hydrating)
    }

由于在父组件的patch的时候，处理abc的时候，已经把相关的所有属性通过prepatch已经覆盖了掉了旧属性，因此通过新的vm的上下文，渲染出的vnode为全新的abc全新的vnode，然后运行update（）进行新老vnode对比，然后再老的oldVnode.elm上面进行diff更新。dom更新的过程跟上面一样，通过patchVnode和updateChildren交替进行。当abc的render watcher更新完毕后，加入abc内部没有引入新的watcher，queue队列已经清空。下面开始重置参数。
    
    // 注意这里slice相当于一个数组深拷贝
    const activatedQueue = activatedChildren.slice()
    const updatedQueue = queue.slice()

    callActivatedHooks(activatedQueue)
    callUpdatedHooks(updatedQueue)
    
    function callUpdatedHooks (queue) {
      let i = queue.length
      while (i--) {
    	const watcher = queue[i]
    	const vm = watcher.vm
    if (vm._watcher === watcher && vm._isMounted) {
      callHook(vm, 'updated')
    }
      }
    }
最后调用updated钩子函数，在queue队列找到watcher.vm逐个通知，由于已经排序好了，所以会从根组开始往内部触发。


    

    