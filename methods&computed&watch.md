## method ##
method这个没什么特殊的，基本上合并vm.$options.methods,然后将methods里面对应的方法bind一个上下文,这个上下文就是接收定义methods这个options对象的实例。
## computed初始化##
computed的初始化有3个部分的逻辑
initComputed（）:这个方法基本上就是检查有没有computed这个属性，然后再vm._computedWatchers上面定义个对象，这个对象存放每个computed对应的watcher，并且键名为computed的方法名。最后defineComputed（）。<br/>
defineComputed()：该方法设置好computed属性的get方法，然后再vm上定义这个以计算属性同名的属性，get方法调用的是watcher里面evaluate，通过evaluate来执行get方法，从而去执行computed属性定义的方法。<br/>
createComputedGetter():该方法创建一个计算属性的get，接受一个参数，这个参数为计算属性的键名，然后通过一个闭包来运行这个get，通过调用当前watcher的evaluate（）来拿到计算属性的值 和 通过depend（）来收集依赖，最后返回watcher.value
## computed是如何具备响应式特性，以及computed是如何避免重复运算相同结果的计算属性 ##
首先说说响应式，每一个computed属性都有一个watcher，这个wathcer的getter，就是定义计算属性的函数，例如

    computed：{
    	someProp（） {
    		return this.aaa + this.bbb
    	}
    }
    new watcher(vm,someProp,noop,{lazy:true})
    this.dirty = this.lazy
    // 初始化dirty为true,所以在第一次初始化生成vnode的时候,this.componentedProps
    // 会去调用computedGetter，根据dirty的值来决定是否计算
    // 如果是dirty就evaluate,其中evaluate会去调用wathcer的get,运行计算属性定义的get,然后取到计算后的值，然后将dirty赋值为false
    // 如果是有Dep.target,就watcher.depend

如上面的代码，someProp作为了watcher的get（）函数中主要的执行代码。前面说到过，由于计算属性的获取，是访问的该计算属性对应封装成的computedGetter，而computedGetter会先判断有没有watcher，如果有，并且dirty才会去evaluate()，在evaluate的时候，实际上去运行了watcher的get，并且运行完后把dirty改为false，这样下一次取值就直接通过watcher.value来取。在evaluate运行完之后，看当前有没有Dep.target，如果有就运行watcher的depend()
    
    function createComputedGetter (key) {
      return function computedGetter () {
    	const watcher = this._computedWatchers && this._computedWatchers[key]
    	if (watcher) {
      		if (watcher.dirty) {
    			watcher.evaluate()
      		}
      		if (Dep.target) {
    			watcher.depend()
      		}
      		return watcher.value
    	}
      }
    }

    evaluate () {
    // 拿到被watch的值
    // 把dirty赋值false
    	this.value = this.get()
    	this.dirty = false
    }

下面看看get（）中运行了什么，evaluate会把当前这个计算属性作为目标watcher，通过调用computed，触发data的get方法。从而把依赖收集到这个watcher的deps中，注意getter的上下文永远是vm上面绑定的实例。

     get () {
    // 把当前实例watcher实例push到一个数组中,这个数组是targetStack
    	pushTarget(this)
    	let value
    // 拿到vue实例
    	const vm = this.vm
    try {
      // 调用getter,拿到被监听的值
      	value = this.getter.call(vm, vm)
    } catch (e) {
      	if (this.user) {
    		handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
    	throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
       // 如果是deep,深度监听,就去遍历这个值
       // 如果这个值是基本类型,情况较为单纯
       // 如果是对象的话,或者是数组,那么会继续遍历下去
    	traverse(value)
      }
      // 弹出push进去的当前watcher对象
      	popTarget()
      // 清空依赖
      	this.cleanupDeps()
    }
    	// 返回值
    	return value
   	}

get（）的运行，伴随着pushTarget（this），this.getter.call(vm,vm),popTarget(),this.cleanupDeps()4个方法.<br/>
getter就是上面的someProp，首先可以知道的是，当第一次执行this.someProp的时候,相当于执行这个函数，this.aaa，this.bbb这2个属性都触发了defineReactive中定义的get的过程，同时由于将pushTarget(this),因此Dep.target就是当前watcher，这个时候aaa属性和bbb属性的dep会被计算属性的watcher收集，并且aaa，bbb的dep中的subs也会压入这个watcher,同时将dirty赋值为false，当下一次继续访问计算属性的时候，由于watcher.dirty为false，因此直接返回的是watcher.value,evaluate运行完后，当前computed的watcher已经被弹栈了，注意，在第一次初始化渲染vnode的时候，在computed Watcher弹栈后，当前的Dep.target会变成vm._watcher，可以认为是视图watcher，这里很关键，因为此时Dep.target存在，且为视图更新的watcher，此时调用wathcer.depend()

      		if (Dep.target) {
    			watcher.depend()
      		}

	     // 把deps中的每个dep对象，都调用depend方法
	      depend () {
	    	let i = this.deps.length
	    	while (i--) {
	      	this.deps[i].depend()
	      // dep对象中的Target即一个watcher对象,使用该watch对象调用addDep(this.deps[i])
	    	}
	      }
如上面代码，depend的作用是，再深入到之前computed watcher中收集的依赖，让那些依赖被视图依赖所收集，因为可以认为计算属性是data的一套算法组合，虽然模板上面绑定的是计算属性的名字，但是这个计算属性是严格依赖这些data的，所以当这些data修改的时候，首先computed值可能会变，从而视图也会变，而computed watcher属于lazy模式，它最多只能计算当前的属性是多少，而视图的更新依旧需要有数据去驱动，所以把计算属性的依赖，也放入视图watcher的依赖中，当计算属性依赖变化后，计算属性只是去计算新的值，而同样收集了计算属性依赖的视图watcher会去更新视图，重新生产vnode。下面来看看这个过程。<br/>
      	
在初始化computed的时候，传入了lazy:ture,这个属性其实就在new watcher的时候不会立即去执行get（），同时将dirty也赋值为lazy这个值，所以初始化的时候dirty为true，当执行一次computed属性之后，dirty为false，下一次取值直接返回wathcher.value,什么时候dirty会变成true呢，就是在this.aaa和this.bbb至少有一个改变的时候,假定this.aaa改变，那么这时this.aaa的defineReactive的set方法会给出一个notify（），该notify（），会通知dep的sub下面的所有watcher，然后进行update，其中就存在这个computed watcher，然后执行update（）,下面看看update（）里面的代码。
		    { dirty：true }
		    this.dirty = this.lazy
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
可以看到由于this.lazy为true，因此对于computed的watcher来说，这里只运行this.dirty = true,而同时对于this.aaa属性，它也被视图watcher收集了，所以视图会更新，dep会去执行quequeWatcher（this），把这个wathcer放到一个更新队列里面，在nextTick的时候，去一个一个的执行，属于this.aaa的updateComponent方法，这个方法里面会去调用vm._render（）来访问计算属性和所有视图用到的属性，因此当访问到计算属性的时候，这个时候由于this.dirty赋值为了true，因此计算属性的方法，会继续执行，算出新的值，只要依赖的属性不发生变化，computed的属性的返回watcher.value，也就是上一次执行后计算属性后的值，这就是computed属性的响应式和不会重复计算相同结果的原因，同时也是构成响应式的原因
## watch ##
watch有几个用法，最常用的就是给一个以.号作为分隔的变量路径，然后给一个回调函数，来进行监听，但是这是最基本的用法，还有跟复杂的是在$watch(fn,cb),fn返回的是一个表达式，cb监听的是这个表达式是否改变，例如

    vm.$watch("a.b.c",function(newValue,oldValue) {});
    vm.$watch(function() {return this.a + this.b},function(newValue,oldValue){...})

watch的目标是个计算属性，但通常来说都是第一种情况，官方对于何时使用watch何时使用computed有这样一种说法，*This is most useful when you want to perform asynchronous or expensive operations in response to changing data*，就是对于改变后的数据，需要异步和一些昂贵的操作，这时候使用watch。然后在watch中第三个参数的options一般情况下的选择有deep:true，immediate（立即执行），deep就针对于对象，只要有层次的对象，都会深层次遍历，immediate是在监听的时候，先不管值变没变首先执行一次回调函数。下面来分析下这些功能的源码实现。watch这一条线，主要存在3个函数，分别是initWatch,createWatcher,$watch,3个方法。<br/>
initWatch:该方法顾名思义就是做初始化opition中的watch选项，这里值得注意的是，一个key值，是一个数组的形式存放多个回调函数，那么会把每个函数都进行createrWatcher，如代码所示。

    function initWatch (vm: Component, watch: Object) {
      process.env.NODE_ENV !== 'production' && checkOptionType(vm, 'watch')
      for (const key in watch) {
    	const handler = watch[key]
    	if (Array.isArray(handler)) {
      		for (let i = 0; i < handler.length; i++) {
    			createWatcher(vm, key, handler[i])
      		}	
    	} else {
      		createWatcher(vm, key, handler)
    	}
      }
    }

createWatcher：该方法可以传递4个参数，分别是vm，keyOrFn，handler，options，vm就是当前vue对象，keyOrFn就是要么是以.作为分割符的keypath要么就是像上面$watch第二行，以一个函数的形式返回某一个计算值，handler就是处理变化的回调函数，options通常来说可以传入immediate或者deep等。createWatcher做的就是标准化参数，最后将标准化的参数传入$watch，判断handler的类型，如果是对象，就认为对象就是options，对象中的handler属性才是handler，如果handler是字符串，那么handler=vm[handler],可以认为其实把一个vm上的属性当做了watch的回调，可以是methods。最后把标准化后的参数，进行vm.$watch(keyOrFn,handler,options)。如下为createWatcher的源码：
    
    function createWatcher (
      vm: Component,
      keyOrFn: string | Function,
      handler: any,
      options?: Object
    ) {
      if (isPlainObject(handler)) {
    		options = handler
    		handler = handler.handler
      }
      if (typeof handler === 'string') {
    		handler = vm[handler]
      }
      return vm.$watch(keyOrFn, handler, options)
    }

最后看看$watch做了什么，$watch这个实例方法，是在Vue构造函数全局初始化的时候并入的，如果到了$watch，handler依旧是对象，那么继续用createWatcher去标准化，通常情况下，不会如此深入。拿到第三个参数options，并在options的user上给一个true，因为只要存在watch选项，或者$watch的调用,基本上都而已认为是用户定义的，Vue内部的初始化，纵观了核心源码，没找到使用了watch选项或者调用了$watch方法的时候，最后watcher = new Watcher（vm，expOrFn，cb，options），然后再判断options.immediate是否为true，如果是true，就先调用一次cb.call(vm,watcher.value),这个watcher.value是在new Watcher的时候，调用了watcher中的get（）函数，最后算出的值。同时通过这样来调用$watch,返回一个teardown，来解绑wathcer。

    var w = vm.$watch("a.b",fn);
    // w为一个tearndown，它只teardown当前这个watcher，通过闭包来实现
    w();//teardown掉watcher
最后先贴一波$watch的源码，如下所示。

      Vue.prototype.$watch = function (
    	expOrFn: string | Function,
    	cb: any,
    	options?: Object
      ): Function {
    	const vm: Component = this
    	if (isPlainObject(cb)) {
      		return createWatcher(vm, expOrFn, cb, options)
    	}
    	options = options || {}
    	options.user = true
    	const watcher = new Watcher(vm, expOrFn, cb, options)
    	if (options.immediate) {
      		cb.call(vm, watcher.value)
    	}
    	return function unwatchFn () {
      		watcher.teardown()
    	}
      }
### 为什么watch能够在变化的时候去执行回调，如果watch的是一个函数返回的值，如何监听及运行回调 ###
    vm.$watch("a.b.c",function(newValue,oldValue) {});
    watch:{"a.b.c":function(newValue,oldValue) {}};
首先看上面这个如何实现在数据变化之后执行回调，其实下面的这种写法（配置到watch属性中），最终通过initWatch方法，最后还是执行的vm.$watch（第一行代码）,而$watch的本质又是new Watcher(vm,"a.b.c",function(newvalue,oldValue){},options),最终会这样，那么现在来分析这句话做了什么。在new wathcer的时候，除了把这些值赋值给watcher实例的属性，同时把vm._watchers中加入当前这个watcher实例，最终执行get（），在初始化watcher实例的时候，第二个参数传入的是"a.b.c",这个参数是个字符串，所以watcher会认为这是个属性，然后去解析它，例如a.b.c最终会解析成一个函数function(obj) {return obj.a.b.c},这个obj基本上就是vm了。源代码如下

    if (typeof expOrFn === 'function') {
      // 如果传入的数是函数则把expOrFn赋值给getter
      this.getter = expOrFn
    } else {
      // 如果string,这个string可能是'a.b.c'这种类型
      // getter是一个函数,接受一个参数,这个参数是一个对象,比如如果传入的是vm,返回属性vm.a.b.c的值,即c的值
      this.getter = parsePath(expOrFn)
      // parsePath返回的是function(obj) {return obj.a.b.c}
      // getter就是一个函数这个函数返回c,
      if (!this.getter) {
    // 如果getter没有值,证明expOrFn这个字符串不是x.x.x
    // 就把getter初始化一个空函数
    this.getter = function () {}
    // 这里的警告信息表示watch的第一个参数非法
    process.env.NODE_ENV !== 'production' && warn(
      `Failed watching path: "${expOrFn}" ` +
      'Watcher only accepts simple dot-delimited paths. ' +
      'For full control, use a function instead.',
      vm
    )
      }
    }
这个只是getter，顾名思义对于watcher来说，getter的意义只是拿到最新的obj.a.b.c,那么回调在哪里呢，回调是需要a.b.c发生set赋值的时候，触发了watcher的update，然后在update（）里面运行run，因为通过$watcher注册的都会带有option.uesr=true的标签，下面看看run（）里面做了什么

    run () {
    if (this.active) {
      // 如果还active,就拿到当前watch的值
      const value = this.get()
      if (
    // 对于对象和数组这种类型,哪怕改变的值是一样的,只要有改动这个过程,也应该触发
    value !== this.value ||
    // Deep watchers and watchers on Object/Arrays should fire even
    // when the value is the same, because the value may
    // have mutated.
    isObject(value) ||
    this.deep
      ) {
    // set new value
    const oldValue = this.value
    this.value = value
    if (this.user) {
      // 个人理解是user为是否是用户定义的属性
      try {
    // 也是调用一样的方法,但是用户属性加了异常控制,便于用户去调试
    this.cb.call(this.vm, value, oldValue)
      } catch (e) {
    handleError(e, this.vm, `callback for watcher "${this.expression}"`)
      }
    } else {
      // 这里调用回调,第一个回调传入vue实例,第一个参数为新值,第二个参数为旧值
      this.cb.call(this.vm, value, oldValue)
    }
      }
    }
      }

如上代码所示，首先调用wathcer.get()，get()只是拿到obj.a.b.c也就是最新的值,然后通过跟this.value进行对比，this.value属于旧值，如果this.user,显然这里是ture,因此会调用this.cb.call(this.vm,value,oldValue),所以这里就是回调函数的调用，并且传入了newValue和oldValue。<br/>
对于下面这种情况

    vm.$watch(function() {return this.a + this.b},function(newValue,oldValue){...})

由于expOrFn是function，所以初始化的时候这个function（）{return this.a + this.b}就是getter，这个getter也是拿到watch的值，只是是用户自定义的,跟前面通过a.b.c转化成的函数类似，同理，只要this.a或者this.b有一个发生变化，那么该watcher就会被通知进行回调函数的执行。实现了监听一个表达式的能力。
## vue中响应式的共同点 ##
computed，watch，这些能够响应式的最根本的原因<br/>
第一，在于他们都是基于data（）里面的属性，比如computed是制造一个函数，函数名就是属性名，然后函数体里面依赖了data（）里面的变量，由于data（）里面的变量都是defineReactive过的，因此触发这个相应的起始也是来自于set这些属性，然后这些属性进行notify（）操作
第二，computed和watcher对于每一个属性，他们都会有一个watcher产生，而wathcer本身也接受expOrFn，cb这样的参数，对于Vdom更新也好，还是计算属性重新计算值，还是watcher在data变化的时候触发回调，无非就是需要一个机制，将这些动作绑定到watcher上，然后在数据变化的时候，通过观察者模式，去告诉对应的watcher去触发这些绑定在上面的行为，这个过程简要来看就是data（）进行notify然后给watcher，wathcer进行update（），update（）上面执行run（），run（）里面执行绑定在wathcer上的计算属性的值或者watcher的回调。
针对响应式，最关键的2个对象就是dep和watcher，这个详细的流程准备独立分出来结合data这个选项来写。
    
