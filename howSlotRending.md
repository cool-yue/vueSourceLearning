slot和props基本上是vue自定义组件的精髓，下面通过源码的角度来分析下slot如何渲染，以及scopedSlot如何渲染。由于我分析的vue基于2.4貌似不支持scopedSlot，但是这篇文章还是去分析scopedSlot。首先来看看slot的用法。
## slot 和 具名slot 渲染前奏##
实际上默认slot就是名字为default的具名slot，要分析slot，得首先从render函数开始。

    "<aaa><div>aaa</div></aaa>"
    with(this){return _c('aaa',[_c('div',[_v("aaa")])])}
    
    // 假定aaa的template如下
    "<div><slot></slot></div>"
    with(this){return _c('div',[_t("default")],2)}

    Vue.prototype._v = createTextVNode

如上面的代码,对于vue的一个组件来说，假如解析第一条，这个模板，第一条生成的render如下面那行，`中间的div`渲染成`aaa vnode`的`children`，根据`vnode`生成规则，在生成`aaa`的时候，`aaa`是一个`vue-component`，它不是一个html原始标签，所以会去aaa渲染的上下文中，去找到components的aaa组件的options，然后通过createComponent生成vnode，而不是通过new Vnode来生成。

    vnode = createComponent(Ctor, data, context, children, tag)
Ctor为aaa组件的options，context为aaa组件渲染的上下文，children为aaa的children，tag为aaa，data为VnodeData，下面来看看具体的过程。

       const baseCtor = context.$options._base
       if (isObject(Ctor)) {
    	Ctor = baseCtor.extend(Ctor)
       }
       data = data || {}
       resolveConstructorOptions(Ctor)
       const propsData = extractPropsFromVNodeData(data, Ctor, tag)
       const listeners = data.on
       data.on = data.nativeOn
       mergeHooks(data)
       const name = Ctor.options.name || tag
       const vnode = new VNode(
    	`vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    		data, undefined, undefined, undefined, context,
    		{ Ctor, propsData, listeners, tag, children },
    		asyncFactory
      	)

创建vue-component的Vnode的过程首先把Ctor，这里是aaa的options进行Vue.extend()，生成aaa组件的构造器，这个函数具体做了什么，具体看extend，这里简要描述下，extend就是创建一个Vue构造函数的子类，它的实现方式与Vue一样，并且具有aaa的options和Vue.options。拿到data，在Ctor上面合并属性，从Ctor和data中对比，抽取成是props的属性，其实解析的时候，props全部解析成attr，并且拿到上下文中对应的值，然后通过data中的attr和Ctor中的options.props中进行对比，如果key匹配，就抽取到propsData里面，原则上这个props其实是js对象的传值，不属于dom的东西，因此抽取到一个对象中，然后抽取data.on到listener，原则上data.on中的定义事件，属于vue通过js自定义的一套的事件模型，本质上就是函数的调用，因此将它抽取到listener中，而将data.nativeOn传入到data.on,nativeOn才是真正的dom事件，然后将hook并入到data中，{init，prepatch，insert，destroy}，最后拿到options.name或者tag，然后创建vue-component的vnode，这个vnode相较于原生的来说，前面抽取了一套属于js范畴的东西，称为componentInstanceOptions，传入上下文，明确tag的名称生成vue-component-cid-name作为新的tag，那么vue-component的Vnode生成完毕。现在要注意的aaa的模板存在Ctor.options.template中，它还是原样存在，并没有生成render，在挂载的函数中才会生成render，然后patch渲染dom。aaa这种非原生标签，首先要通过init去实例化，实例化的过程中，会得到一些属性，具体过程去看instance的实例化过程。

    i(vnode, false /* hydrating */, parentElm, refElm)
如上面代码，vnode为aaa的vnode，parentElm为aaa渲染上下文的父dom元素，refElm为插入dom的相对基准点，vnode.elm会插入到refElm前面。
    
     child = vnode.componentInstance = createComponentInstanceForVnode(
    			vnode,
    			activeInstance,
    			parentElm,
    			refElm
      		)
     child.$mount(hydrating ? vnode.elm : undefined, hydrating)

       const vnodeComponentOptions = vnode.componentOptions
       const options: InternalComponentOptions = {
    		_isComponent: true,
    		parent,
    		propsData: vnodeComponentOptions.propsData,
    		_componentTag: vnodeComponentOptions.tag,
    		_parentVnode: vnode,
    		_parentListeners: vnodeComponentOptions.listeners,
    		_renderChildren: vnodeComponentOptions.children,
    		_parentElm: parentElm || null,
    		_refElm: refElm || null
      }
     return new vnodeComponentOptions.Ctor(options)
在解析aaa的模板的时候，aaa的children已经被解析到了children中，但是并不知道这个标签会放哪里，因为还不知道aaa有没有slot，如果没有slot，这个children会直接被忽略，因此aaa的实例，传入的children名字为\_renderChildren,最后实例化。在实例化的过程中有一个initRender的过程，这里会处理children，下面来看看

    vm.$slots = resolveSlots(vm.$options._renderChildren, renderContext)

##$slot ##
$slot属性到底存的是什么。$slot是一个对象,这个对象的键为slot的名字，默认的名字为default，值为一个vnode的数组，这些vnode为兄弟节点。
    {
       "default":[vnode],
       "header":[vnode],
       "footer":[vnode]
    }
在组件实例化的时候，initRender的过程已经将aaa的children渲染到vm.$slot.default中了（如果slot不具名），如果是具名的话逻辑如下：

    "<aaa><div slot='header'>aaa</div></aaa>"
    with(this){return _c('aaa',[_c('div',{attrs:{"slot":"header"},slot:"header"},[_v("aaa")])])

    if ((child.context === context || child.functionalContext === context) &&
      child.data && child.data.slot != null
    ) {
    
    	const name = child.data.slot
   	 	const slot = (slots[name] || (slots[name] = []))
      	if (child.tag === 'template') {
    		slot.push.apply(slot, child.children)
      	} else {
    		// 如果tag不是template
    		// 那么就直接压进去
    		slot.push(child)
      	}
     }

如上代码，当使用具名slot属性的时候，render之后vnode会存在slot属性，因此具名组件需要判断data.slot的值是否存在，下面看看在aaa渲染的过程中，对应的template的到render做了什么
#VnodeData的slot#
VnodeData的slot属性为一个字符串，这个字符串记录slot的名称，如果没有名称，则为"default",在aaa组件初始化完后，会进行挂载，挂载会生成对应的dom，下面来看看这个过程。
## slot 和 具名slot 渲染##
    "<div><slot></slot></div>"
    // 渲染后
    with(this){return _c('div',[_t("default")],2)}

    "<div><slot><div>aaaa</div></slot></div>"
    // 渲染后，当在slot传入div后，_t函数多了第二个参数
    // 这第二个参数表示当没有传入
    with(this){return _c('div',[_t("default",[_c('div',[_v("aaaa")])])],2)}
    
    
    "<div><slot name='header'></slot><slot name='footer'></slot><slot></slot></div>"
    // 渲染后
    with(this){return _c('div',[_t("header"),_t("footer"),_t("default")],2)}
    
    Vue.prototype._t = renderSlot
上面是模板解析成对应的render函数，下面看看这个vnode如何生成，看看renderSlot做了什么。
   
    const slotNodes = this.$slots[name]
    return slotNodes || fallback


fallback为默认的slot输出，它会放在renderSlot的第二个参数，当没有传入的时候，就会将它渲染。这样这个aaa中间的renderSlot就已经被解析出来的children给替换了。
## 过程小结 ##
假定有如下的模板：

    <aaa><div>aaa</div></aaa>

    // 解析出对应的vnode
    tag:"vue-component-cid-aaa"
    context:abc渲染的上下文
    // 抽取出propsData，children，Ctor
    componentInstanceOptions:{Ctor,tag,children:[<div>aaa</div>的vnode]}
Ctor中有template，children中就是aaa的children的vnode，在aaa组件渲染的时候会先去实例化aaa，在实例化的过程中，children和context会作为传入的参数，来渲染$slot,这里会变成下面这样

    $slot = {"default":[<div>aaa</div>的vnode]}

最后在aaa进行挂载的时候，会把aaa的template解析成render函数

    假定aaa的tempalte为<div><slot></slot></div>
    这个将解析成 _c('div',[_t("default")])
    这个vnode在生成的时候会去找vm.$slot.default,然后返回
    也就是最终会生成_c('div',[<div>aaa</div>的vnode])
    vnode已经生成，然后update更新到dom中。

slot的渲染是options中的tempalte加上父环境渲染上下文中解析出来的children进行替换。
## children和slot的区别##
slot和children的区别，slot是在children不确定是什么的情况下的一种解决方案，它更多的时候是由于父组件的上下文决定的，并且通过名称的区分，能够抽取不同的部分，而children就是笼统的所有的子节点，不具有特殊性，也不具有灵活性（已经事先定好），但是总的来说，slot最终渲染后，也会是children。
## scopedSlot ##
下面来看看scopedSlot

    // 父上下文渲染
    <ul><dx-li><span slot-scope="scope">{{scope.str}}</span></dx-li></ul>
    // 渲染后
    with(this){return _c('ul',[_c('dx-li',{scopedSlots:_u([{key:"default",fn:function(scope){return _c('span',{},[_v(_s(scope.str))])}}])})],1)}
    
    // dx-li
    `<li class="dx-li">	<slot str="你好 掘金！">hello juejin!</slot></li>`
    // 渲染后
    with(this){return _c('li',{staticClass:"dx-li"},[_t("default",[_v("hello juejin!")],{str:"你好 掘金！"})],2)}

    target._s = toString;
    target._u = resolveScopedSlots;
    target._t = renderSlot;
    target._v = createTextVNode;

上面是scoped-slot解析后的样子，可以发现实际上带上slot-scope属性的标签会抽取成一个vnodedata中的scopedSlots属性，而不是渲染是children，那么看看scopedSlots在上面的例子中解析成了什么。

      _u([{key:"default",fn:function(scope){return _c('span',{},[_v(_s(scope.str))])}}])
      key:"default"
      fn:function(scope){return _c('span',{},[_v(_s(scope.str))])}

      function resolveScopedSlots (
    	fns, // see flow/vnode
    	res
      ) {
    	res = res || {};
    	for (var i = 0; i < fns.length; i++) {
      		if (Array.isArray(fns[i])) {
    			resolveScopedSlots(fns[i], res);
      		} else {
    			res[fns[i].key] = fns[i].fn;
      		}
    	}
    	return res
      }
      通过解析后，生成下面的vnode:
      _c("dx-li",{scopeSlots:{default:fn}})
resolveScopedSlots函数的逻辑就是将key值和fn值抽取出来组成key:fn，将这个键值对放进scopeSlots:{default:fn},下面来看在dx-li在实例化到最后挂载的过程。

    // dx-li
    `<li class="dx-li">	<slot str="你好 掘金！">hello juejin!</slot></li>`
    // 渲染后
    with(this){return _c('li',{staticClass:"dx-li"},[_t("default",[_v("hello juejin!")],{str:"你好 掘金！"})],2)}
    // 在dx-li _render的时候,拿到dx-li中实例的scopedSlots属性
    if (_parentVnode) {
        vm.$scopedSlots = _parentVnode.data.scopedSlots || emptyObject;
    }
    // 拿到父占位符的scopedSlots属性
这里要注意的是在slot上面传入属性后，最后的renderSlot会传入第三个参数，第三个参数是一个对象，这个对象为:

    {str:"你好 掘金！"}
然后renderSlot的过程，
    
    const scopedSlotFn = this.$scopedSlots[name]
    props = props || {} // 这里为{str:"你好 掘金！"}
    if (scopedSlotFn) { // scoped slot
    	props = props || {}
    	if (bindObject) {
      		props = extend(extend({}, bindObject), props)
    	}
        return scopedSlotFn(props) || fallback
    }

要拿到最终的渲染结果，首先要运行scopedSlotFn(props),即fn，这里fn为如下：

      // 这里的scope为props
      // {str:"你好 掘金"}
    
      function(scope){return _c('span',{},[_v(_s(scope.str))])}}
      renderSlot最终就返回<span>你好 掘金</span>
     
      // 最后变成了<li class="dx-li"><span>你好 掘金</span></li>
## scoped小结 ##
按照官方的说法：有的时候你希望提供的组件带有一个可从子组件获取数据的可复用的插槽，也就是说子组件既需要slot，同时有些状态也需要子组件里面的内容来确定。那么这种情况下使用scoped Slot。<br/>
scoped Slot的渲染过程就是，由于它会依赖子组件内部的状态，因此此时scopedSlot并不立即渲染，而是在parentVnode上面生城一个scopeSlots的属性，这个属性的键为slot的名字，值为一个依赖于内部组件的一个方法，这个方法会在子组件渲染slot的时候，去拿到父组件的scopedSlot，然后子组件的slot的属性也需要传入一些值，<slot str="aaa"\></slot\>,这个str会在render的时候生城一个对象{str:aaa},然后传入scopedSlot的方法作为参数，最后渲染出依赖于子组件的slot上面str的vnode。<br/>
最后说一下slot-scope="xxx",这个xxx的名字没有任何意义，最终这个xxx会作为子组件slot上面的属性列表,比如

    <dx-li><span slot-scope="aaa">{{aaa.abc}}</span></dx-li>
    //dx-li内的tempalte
    <li><slot abc="abc" bbb="bbb" ccc="ccc"></slot></li>
    // aaa 表示 {abc:"abc",bbb:"bbb",ccc:"ccc"}
最终在dx-li渲染的时候，内部的slot的渲染，通过拿到这个{abc:"abc",bbb:"bbb",ccc:"ccc"}作为上下文来生成vnode
