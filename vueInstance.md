# vueInstance #
组件的实例化，回到最初的时候，当初写vue的tempalte的时候还在想为什么<abc></abc>这样的标签，是不是真的创造了标签，只需要给个components：{abc}，就可以在template中写<abc>这样的标签，然后最终把abc的options中的template，替换到了这个<abc>标签的位置。现在简单介绍下<abc>标签是如何的渲染到dom中去的，首先在渲染<abc></abc>的地方，肯定也是另外一个组件的template中，这个组件就是<abc></abc>渲染的上下文context，当这个context的tempalte进行render的时候，也就是生成vnode的时候，发现了有一个<abc></abc>这么怪里怪气的标签，它不是html的约定的标签，发现这个事实后，显然它是自定义的组件，于是赶紧在上下文中的components中找到是不是有对应的属性，并且会对这个属性进行hyphen化来匹配(如果有必要)，因为html大小写不敏感，找到了之后，就拿到了对应的组件的options，这个options就可以认为是个<abc>的options，然后针对这个options来进createComponent，因为options是个对象，所以使用Ctor = baseCtor.extend(Ctor)，这个操作中有一些列的合并选项的操作，总而言之生成了<abc></abc>组件实例的构造器，接下来，拿到解析出来的data，通过data中传入的prop和Ctor中的options.props来把props从attr里面抽取出来，形成一个变量叫propsData,把data.on转化listener，nativeOn给on，因为原则上，nativeOn才是真正的dom事件，这个最终在web端dom插入后，通过遍历on这个对象，来进行dom的绑定，而listener里面属于vue自定义的事件模型，将他们放入vm._events上，然后在data中并入hook这个属性，hook有4个属性{init，prepatch，inserte，destroy}，拿到options中的name，如果没有就用tag代替，这也就是为什么name属性尽量添加上去，这样会便于定位错误和调试，最后才生成一个以vue-component-cid-name为名称的vnode，传入context，传入{Ctor，propsData，listener，tag，children}作为compoonentInstanceOption。vnode创建完毕，当后面进行dom创建的时候，会观察vnode上面有没有hook.init,这个是自定义组件特有的，然后这里会调用init，init里面会为这个vnode先创建componentInstance，通过传入作为compoonentInstanceOption的这些选项，进行实例化，实例化做了什么后面后面一点一点说。在实例化后，会继续$mount,这个mount是挂载到undefined上面了,它确实没有插入到任何地方，而是在内存中，因为挂载后，elm已经产生，而对于context中tempalte的渲染，主需要abc的elm就行了，，所以最终实例产生，对应的$vnode产生，同时vnode.elm也产生，<abc>组件init完毕，然后insert到context中指定的位置（vnode的结构能够反映父子关系），依次递归完成所有操作。下面是组件实例化的过程。
## initLifecycle ##
## initEvents ##
## initRender ##
## callHook(vm, 'beforeCreate') ##
## initInjections ##
## initState ##
## initProvide ##
## callHook(vm, 'created') ##
至此组件实例化完毕，挂不挂载，就看是否有$el属性,挂载调用vm.$mount
