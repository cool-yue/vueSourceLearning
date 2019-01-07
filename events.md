vue的事件系统跟原生的是有一定的区别的，属于自己实现的一套事件系统，由于用户可以随意定义事件名，因此可以认为就是定义了一些函数，找到一个合适时机去触发它。原生的dom中也有一套事件机制，反正2个都很相似，但是vue的话，更加面向用户自定义。下面带几个问题去解析下源码。
## 模板如何解析 ##
如下面的模板

    var template = "<div @click='aaa' @aaa='bbb+1'></div>"
    console.log(Vue.compile(template));
    // 下面的是生成的render函数
    with(this){return _c('div',{on:{"click":aaa,"aaa":function($event){bbb+1}}})
如上面的代码所示,对于@click='aaa'最终解析成的data中的on属性的click：aaa,aaa取this.aaa的属性。对于@aaa='bbb+1',由于bbb+1是表达式,因此在将这句表达式放进一个function中，并且function暴露一个$event变量,也就是说，我们在写表达式的时候，可以用$event这个变量表示event对象，例如@aaa="console.log($event)",最终解析出这是一个语句，然后把它放进function中最后就变成了function($event) {console.log($event)}
## 事件是如何初始化的 ##
events的是初始化分2步,第一步在全局Vue对象上面混入全局方法下面来看看全局混入,第二步的初始化才是vm实例上面的初始化
## 全局 ##
全局初始化4个方法
## Vue.prototype.$on ##
$on方法顾名思义，就是监听事件。$on方法接受2个参数，第一个参数为string或者string数组，第二个参数就回调函数。当第一个参数是字符串数组时候，就遍历这个数组，然后递归调用$on(),就是把数组打散成单个。如果第一个参数只为字符串，那么就在vm._events[event]=[],然后把函数push进去，其中event为第一个参数的名字，也就是说，每个事件都在vm._event对象中，以事件名作为key，数组作为值，将传入的回调push进去。最后注意，当事件名以hook:开头,那么还要在vm._hasHookEvent赋值为true。注：$on的两个参数都必须传的

 	Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        this.$on(event[i], fn)
      }
    } else {
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }

## Vue.prototype.$off ##
$off就是移除事件，它接受的参数与on一样，不一样的是2个参数都是可选的,当没有参数传入的时候,就是移除整个监听的事件。如下：

    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
如果传入了第一个参数，但是没传入第二个参数，那就就把vm._events上面对应的键的值置为空

    const cbs = vm._events[event]
    if (!cbs) {
      return vm
    }
    if (arguments.length === 1) {
      vm._events[event] = null
      return vm
    }

如果传入了第一个参数又传入了的第二个参数，循环遍历cbs，如果存在===的那么就splice
    
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
    cbs.splice(i, 1)
    break
      }
    }
如果第一个参数是数组，那么就把数组分解成每个元素，进行循环调用,重复上面的过程。

    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
    this.$off(event[i], fn)
      }
      return vm
    }

## Vue.prototype.$once ##
$once表示这个事件只触发一次。这里产生了闭包。将绑定的fn，包装在一个函数中，这个函数首先执行vm.$off,然后再调用fn.apply(vm,arguments)。代码如下：

    Vue.prototype.$once = function (event: string, fn: Function): Component {
	    const vm: Component = this
	    function on () {
	      vm.$off(event, on)
	      fn.apply(vm, arguments)
	    }
	    on.fn = fn
	    vm.$on(event, on)
	    return vm
      }

## Vue.prototype.$emit ##
$emit触发为触发一个事件,首先拿到event的名字，然后在vm._events[event]中取到这个数组,cbs.length>1,把cbs转化成数组，把传入的参数从第二个开始，转化成一个参数数组。然后循环遍历cbs，运行cbs[i].apply(vm,args);

     let cbs = vm._events[event]
    if (cbs) {
	      cbs = cbs.length > 1 ? toArray(cbs) : cbs
	      const args = toArray(arguments, 1)
	      for (let i = 0, l = cbs.length; i < l; i++) {
	    try {
	      cbs[i].apply(vm, args)
	    } catch (e) {
	      handleError(e, vm, `event handler for "${event}"`)
	    }
	      }
    }
例如this.emit('aaa',1,2,3,4),先去获取cbs = vm._evnets['aaa'],然后将emit的参数转化为args = [1,2,3,4],然后调用cbs[i].apply(vm,args);
### 实例 ###
实例的初始化较为简单，在vm._events上定义个对象，将_hasHookEvent设置为false，然后拿到$options._parentListeners,然后更新。更新做了什么呢？既然是初始化，就没有oldListener，调用的是updateListeners(listeners, oldListeners || {}, add, remove, vm)。

    const listeners = vm.$options._parentListeners
    updateComponentListeners(vm, listeners)
    
    function updateComponentListeners (
      vm: Component,
      listeners: Object,
      oldListeners: ?Object
    ) {
      target = vm
      updateListeners(listeners, oldListeners || {}, add, remove, vm)
    }
    
	    for (name in on) {
	    cur = on[name]
	    old = oldOn[name]
	    event = normalizeEvent(name)
	    add(event.name, cur, event.once, event.capture, event.passive)
    }
对应render解析出来的on属性，会被抽取到listener形成一个对象，然后拿到这个对象，最后绑定到vm上面。
## @click为什么最终可以变成onclick的效果,而其他的事件比如aaa这种为什么就是通过emit去触发 ##