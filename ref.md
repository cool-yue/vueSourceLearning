ref属于较为简单的一个属性，下面来说说ref是如何渲染的，所有放在modules中的模块，都是跟dom相关的,也就是说,当dom渲染完毕之后，再往dom上面加入这些。
## 写在前面 ##
  
    // style:显然是有dom才能去添加对应的style
    // class
    // events:处理原生事件
    // attrs:类似于id啊 这类的
    // :这个处理innerHTML类似dom.xxx = xxxx,这样来处理    
    // baseModules有:refs directive
    // directive是数组中最后一个一个对象,在所有内建模块都渲染到dom上面的时候
    // 再执行directive
    
    createChildren(vnode, children, insertedVnodeQueue)
    if (isDef(data)) {
      invokeCreateHooks(vnode, insertedVnodeQueue)
    }
    
    insert(parentElm, vnode.elm, refElm)

    
      function invokeCreateHooks (vnode, insertedVnodeQueue) {
    	// 遍历在cbs.create属性数组然后调用
    	// create(空vNode,vnode),后面是传入的vnode
    	for (let i = 0; i < cbs.create.length; ++i) {
      		cbs.create[i](emptyNode, vnode)
    	}
    	// 拿到data中的hook
    	i = vnode.data.hook // Reuse variable
    	if (isDef(i)) {
      	// 如果hook里面有create和insert就调用
      	// 把insert push到 insertedVnodeQueue
      		if (isDef(i.create)) i.create(emptyNode, vnode)
      		if (isDef(i.insert)) insertedVnodeQueue.push(vnode)
    	}
      }

上面这段代码是在一个vue-component的dom创建完成后，就会调用invokeCreateHooks，这个create钩子在createPathFunction初始化的时候，装入了cbs,cbs函数第一个参数传入的是空vnode,第二个传入的组件对应的vnode,如果data中有hook表示这是一个vue-component，那么会调用vue-component的内部的create钩子，如果存在insert会把当前的vnode压入insertedVnodeQueue，如下代码所示为装入cbs的过程：

    const hooks = ['create', 'activate', 'update', 'remove', 'destroy']
    const cbs = {}
    const { modules, nodeOps } = backend
    for (i = 0; i < hooks.length; ++i) {
	    cbs[hooks[i]] = []
	    for (j = 0; j < modules.length; ++j) {
	      if (isDef(modules[j][hooks[i]])) {
	    	cbs[hooks[i]].push(modules[j][hooks[i]])
	      }
    	}
    }
上面的代码在创建patch的时候,初始化一个cbs,这个cbs里面装有所有的拥有hooks中属性的方法集合,这些方法来自于开篇提到的那些模块，比如对于create，在cbs中，它的值为一个数组，装有sytle，class，events，attrs，ref，directive这些create的方法。其余也是类似的。
# platform #
跟平台相关的，这里特指web
## style ##
style会和staticStyle进行合并，然后通过style对象的方法进行添加
## class ##
class会和staticClass进行合并，然后通过ClassList等，setAttribute来进行class的添加，抽取，更新。
## events ##
针对events，这里已经抽取了listener，因此在on中都是原生事件，因此在这里create，update就是通过addEventListener在dom上面绑定原生事件。
## attrs ##
attrs已经把props抽取出来了，这里绑定是通过setAttribute在dom上面进行绑定。
## dom-props ##
dom-props原则上通过模板是体现不出来的，因为它是一种dom对象的赋值过程，但是通过写render函数可以体现出来，动过domProps：{}，解析这个属性，然后通过elm.xxx= xxx来解析这个属性。
# base #
base这边是跟平台无关的基于dom的一些东西
## refs ##
    const key = vnode.data.ref
    const vm = vnode.context
    const ref = vnode.componentInstance || vnode.elm
    const refs = vm.$refs
  以上是公共代码的逻辑基本上就是拿到vnode中data中的ref值，然后拿到vnode渲染的上下文，这个就是父组件，然后拿到vnode的instance如果没有就用elm，最后拿到初始化加入的vm.$refs,初始化的时候这个值为一个空对象。
### create ###
    registerRef(vnode)
    // 下面是函数里面运行的内容
    refs[key] = ref
上面代码相当于如果ref放在vue-component上面，那么ref就为instance，如果不是vue-component，就是对应的dom。一般的情况基本上就是上面的赋值，但是ref也可能存在for循环中，那么for循环中是如何选取元素呢？
### update ###

    if (oldVnode.data.ref !== vnode.data.ref) {
      registerRef(oldVnode, true)
      registerRef(vnode)
    }

    基于oldVnode来一次remove
    if (Array.isArray(refs[key])) {
      remove(refs[key], ref)
    } else if (refs[key] === ref) {
      refs[key] = undefined
    }

    基于新vnode来一次添加，跟create的内容一样
    refs[key] = ref
### destroy ###
    registerRef(vnode, true)

    if (Array.isArray(refs[key])) {
      remove(refs[key], ref)
    } else if (refs[key] === ref) {
      refs[key] = undefined
    }

## directive ##
### create ###
### update ###
### destroy ###
