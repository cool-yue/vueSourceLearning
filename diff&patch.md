diff算法是程序上最小化的更新，它抛弃了严格地层次遍历，而是选择了几种情况，这样就把一次的复杂度转从n转化成了1，比如n个节点对比，取出新的节点，然后与旧的每一个都去做循环比对，这个复杂度是n，取而代之的是头头，头尾，尾头，尾尾的4种情况的比较，当这4种情况不满足的时候，最后根据key是否存在进行高效更新，如果key不存在就创建一个新的节点。下面来分析一下vue中的patchVnode的逻辑。
## patchVnode ##
通常在更新的时候,会是这样形式的调用,patch(oldVode,vode),下面来分析里面的逻辑,如果oldVnode === vnode，那么就不用更新。

    if (oldVnode === vnode) {
      return
    }

如果它们不相等，那么就要玩真的了，开始比对了，但是首先要做一系列准备工作。

    const elm = vnode.elm = oldVnode.elm

拿到old的elm，因此在patch的时候，vnode的elm还没生成，vnode的elm需要通过diff算法，在oldVnode.elm的基础上去增量更新，这样就能优化性能，而不是完全重新创建，所以初始化让vnode.elm = oldVnode.elm,这样由于elm属于对象，在oldVnode.elm上面修改，那么vnode.elm引用同样的elm，因此vnode.elm上也会得到相应的更新。

    isTrue(oldVnode.isAsyncPlaceholder) // 这里是处理异步占位符,这里先不管
    
    // 这里是静态组件判断，静态组件可以认为视图不会再更新了
    // 所以只需要把oldVnode上面的组件给vnode.componentInstance
    isTrue(vnode.isStatic) && isTrue(oldVnode.isStatic) && vnode.key === oldVnode.key && (isTrue(vnode.isCloned) || isTrue(vnode.isOnce) {
         vnode.componentInstance = oldVnode.componentInstance
         return
    }
如果上面的条件都不满足，那么拿到vnode.data,判断data中有没有prepatch的hook，如果有就运行prepatch（oldVnode，vnode）

    let i
    const data = vnode.data
    if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
    	i(oldVnode, vnode)
    }
顾名思义这里是预更新,并且针对的是vue-component的情况,根组件不算，可以认为这里处理的是除了根组件外的，拥有组件实例的组件，比如<abc></abc>,在创建abc的vnode的时候会变成vue-component-cid-abc,并且在data中并入这个prepatch的hook，也就是说，只有vue-component的patch才会先走prePatch，那么看看prePatch做了什么。

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

之所以要做这个prePatch的原因是,这是vue组件的更新，vnode上不光有elm,还有instance，还有instanceOptions，由于instanceOptions里面的东西存在响应的内容，{Ctor,propsData,listener,tag,children},这里面的几个属性是普通元素不具备的，但如果放在vue-component上，这几个属性，会影响组件最终渲染出来的dom的样式，比如children换了，比如propsData里面的值换了，那么最后的视图是不一样的，同时新的vnode创建了，显然不应该再以新的vnode去创建instance，这样就没有diff的意义了，现在的问题是，在通过_render创建了新的Vnode的时候，实际上通过模板的解析已经把props，children，listener这些变化给放入了新生成的vnode.componentOptions中了，这些只有vue-component才具备这些东西，并且能够反映到vnode的componentOptions中,所以vnode.ComponentOptions里面存有更新后的propsData,listener,children。

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
总结上面的updateChildComponent基本上就是在已经存在的vm实例上面，来更新这些属于instance的一些属性。vnode现在已经是新版本的了，vm的实例也更新了，主要是更新$options里面的属性。这里需要注意的是，修改props或者存在slot的渲染，也就是解析出了存在renderChildren的情况下，这2个操作都会触发render watcher的update方法，有props属性的更新，既然有props那么这个属性一定是父子之间传递用的，由于父context里面进行了this.xxx = xxx的操作，相当于对xxx属性进行了set操作，set操作会触发watcher的update方法。而拥有renderChildren的情况下，会直接进行vm.$forceUpdate(),这是因为假如没有props的set操作，那么就不会触发更新的，而slot的渲染，是一定要触发更新的，因为renderChildren需要从父context的上下文传入到子组件的vm实例上面，然后通过$slot传入，从而forceUpdate（）之后将子组件的render wathcer 压入了queue中，这时vm已经是拥有更新或者没有更新的$slot的值了，这样在vm去render（）生成vnode的时候，才能正确的解析出slot部分应该如何渲染。回到前面，既然props新值的覆盖或者slot存在，会触发render watcher的update那么，看看update做了什么。
    
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

以上update的代码。lazy是针对计算属性的，sync字段是同步，一般情况下不会设置sync，所以会运行queueWatcher(this),也就是把这个watcher压入到queue中，注意的是，这里的过程是，父组件的run方法还没执行完，在执行的过程中，将子组件的watcher压入了queue中，flushQueue的的循环执行中，又放入了一个待执行的render watcher，所以这里这个循环遍历flush queue的长度又增加了，依次进行下来，比如当下一个watcher执行的时候，可能还会引入新的wathcer，那么queue队列又会追加一个进去，以此不停地追加下去，直到没有触发新的render watcher位置，另一方面，在收集新的render watcher的时候，会充分考虑到watcher的id，将id以正确的顺序插入，而不是简单的push，这样的好处在于，顺序一致，比如组件a,id为1里面有组件b，id为2，b组件后面是组件c，id为5，在b组件的watcher执行的时候，引入了新的组件d，id为4，由于目前在更新组件b，而d从属于d，因为vue的组件是按照深度优先来渲染的，因此渲染d相当于渲染b的一部分，因此b需要放在c的前面来执行，所以这个时候就需要通过id来找准watcher的顺序，这样在渲染的时候，才更加符合先后的顺序。

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


    