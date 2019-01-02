## method ##
method这个没什么特殊的，基本上合并vm.$options.methods,然后将methods里面对应的方法bind一个上下文,这个上下文就是接收定义methods这个options对象的实例。
## props 初始化##

## props 能够实现父传子的实现##
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
如上面的代码，someProp作为了watcher的get（）函数中主要的执行代码。前面说到过，由于计算属性的获取，是访问的该计算属性对应的wathcer的evaluate方法。下面看看evaluate方法的内容。

    evaluate () {
    // 拿到被watch的值
    // 把dirty赋值false
    	this.value = this.get()
    	this.dirty = false
    }

如上面代码所示基本上只有2句话，就是运行this.get(),下面看看get（）中运行了什么

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
getter就是上面的someProp，首先可以知道的是，当第一次执行this.someProp的时候，相当于执行了方法体，this.aaa，this.bbb这2个属性都触发了defineReactive中定义的get的过程，同时由于将pushTarget(this),因此Dep.target就是当前watcher，这个时候aaa属性和bbb属性的dep会被计算属性的watcher收集，并且aaa，bbb的dep中的subs也会压入这个watcher,同时将dirty赋值为false，当下一次继续访问计算属性的时候，由于watcher.dirty为false，因此直接返回的是watcher.value,见如下代码。

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
在初始化computed的时候，传入了lazy:ture,这个属性其实就在new watcher的时候不要去立即去执行get（），同时将dirty也赋值为lazy这个值，所以初始化的时候dirty为true，当执行一次computed属性之后，dirty为false，下一次取值直接返回wathcher.value,什么时候dirty会变成true呢，就是在this.aaa和this.bbb至少有一个改变的时候,假定this.aaa改变，那么这时this.aaa的defineReactive的set方法会给出一个notify（），该notify（），会通知dep的sub下面的所有watcher，然后进行update，下面看看update（）里面的代码。

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
可以看到由于this.lazy为true，因此对于computed的watcher来说，这里只运行this.dirty = true,而对于this.aaa属性的dep会去执行quequeWatcher（this），把这个wathcer放到一个更新队列里面，在nextTick的时候，去一个一个的执行，属于this.aaa的updateComponent方法，这个方法里面会去调用vm._render（）来访问计算属性和所有视图用到的属性，因此当访问到计算属性的时候，这个时候由于this.dirty赋值为了true，因此计算属性的方法，会继续执行，算出新的值，只要依赖的属性不变化，computed的属性的返回永远缓存到watcher.value中，这就是computed属性的响应式和不会重复计算相同结果的原因。
## watch ##