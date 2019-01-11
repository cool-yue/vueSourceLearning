# vueInstance #
组件的实例化，回到最初的时候，当初写vue的tempalte的时候还在想为什么<abc></abc>这样的标签，是不是真的创造了标签，只需要给个components：{abc}，就可以在template中写<abc>这样的标签，然后最终把abc的options中的template，替换到了这个<abc>标签的位置。现在简单介绍下<abc>标签是如何的渲染到dom中去的，首先在渲染<abc></abc>的地方，肯定也是另外一个组件的template中，这个组件就是<abc></abc>渲染的上下文context，当这个context的tempalte进行render的时候，也就是生成vnode的时候，发现了有一个<abc></abc>这么怪里怪气的标签，它不是html的约定的标签，发现这个事实后，显然它是自定义的组件，于是赶紧在上下文中的components中找到是不是有对应的属性，并且会对这个属性进行hyphen化来匹配(如果有必要)，因为html大小写不敏感，找到了之后，就拿到了对应的组件的options，这个options就可以认为是个<abc>的options，然后针对这个options来进createComponent，因为options是个对象，所以使用Ctor = baseCtor.extend(Ctor)，这个操作中有一些列的合并选项的操作，总而言之生成了<abc></abc>组件实例的构造器，接下来，拿到解析出来的data，通过data中传入的prop和Ctor中的options.props来把props从attr里面抽取出来，形成一个变量叫propsData,把data.on转化listener，nativeOn给on，因为原则上，nativeOn才是真正的dom事件，这个最终在web端dom插入后，通过遍历on这个对象，来进行dom的绑定，而listener里面属于vue自定义的事件模型，将他们放入vm._events上，然后在data中并入hook这个属性，hook有4个属性{init，prepatch，inserte，destroy}，拿到options中的name，如果没有就用tag代替，这也就是为什么name属性尽量添加上去，这样会便于定位错误和调试，最后才生成一个以vue-component-cid-name为名称的vnode，传入context，传入{Ctor，propsData，listener，tag，children}作为compoonentInstanceOption。vnode创建完毕，当后面进行dom创建的时候，会观察vnode上面有没有hook.init,这个是自定义组件特有的，然后这里会调用init，init里面会为这个vnode先创建componentInstance，通过传入作为compoonentInstanceOption的这些选项，进行实例化，实例化做了什么后面后面一点一点说。在实例化后，会继续$mount,这个mount是挂载到undefined上面了,它确实没有插入到任何地方，而是在内存中，因为挂载后，elm已经产生，而对于context中tempalte的渲染，主需要abc的elm就行了，，所以最终实例产生，对应的$vnode产生，同时vnode.elm也产生，<abc>组件init完毕，然后insert到context中指定的位置（vnode的结构能够反映父子关系），依次递归完成所有操作。下面是组件实例化的过程。<br/>
如果都到实例化这一步了，基本上可以说明，当前的组件是一个vueComponent所以在Instance创建的过程中会设置很多标志位和初始化很多后面要用到的变量和属性，下面通过源码一个个看。
#根组件的实例化#
根组件的实例化，跟子组件的实例化略微有些区别，用的时候，一般都会有app = new Vue({}),然后app.$mount(el),只需要根组件来做这个事情。那么看看根组件的实例化经历了什么。这里不考虑根组件也是自定义组件，考虑根组件是个<div><abc></abc></div>这样的情形而不是<abc></abc>的情形。后面针对子组件abc的渲染再来执行，当然如果根组件直接是这样的<abc></abc>实际上就是abc的渲染，但是为了体现上下文的友好和上下文传递属性的直观性，先只考虑<div><abc></abc></div>，先渲染<div><abc></abc></div>再渲染<abc></abc>里面的内容，这样的上下文的逻辑较清晰。

    const vm: Component = this
    vm._uid = uid++
    vm._isVue = true
首先把this指向一个vm，也就是根组件实例，然后_uid = uid++,根组件的uid为0，然后isVue赋值为true，options._isComponent显然是没有的，于是就会运行这里。
    vm.$options = mergeOptions(
	    resolveConstructorOptions(vm.constructor),
	    options || {},
	    vm
      )
首先mergeOptions是就是把Options里面的属性进行合并，根据不同字段策略会不同，比如hook会把重复的值进行合并成数组，components，directives，filters这些会把合并的内容也就是parent的内容，放在__proto__上,methods,props,computed基本上是子组件有定义，就用子组件的，data（）因为是函数返回对象，因此合并的时候，其实是调用函数之后，再合并，以子组件的为准，watch跟hook类似，同样的字段的会合并成一个大数组。类似的这些细节在options.js中，并且extend方法里面会用到。<br/>
vm.constructor就是Vue，所以resolveConstructorOptions的处理方法是:

    function resolveConstructorOptions (Ctor: Class<Component>) {
      let options = Ctor.options
      if (Ctor.super) {
	    const superOptions = resolveConstructorOptions(Ctor.super)
	    const cachedSuperOptions = Ctor.superOptions
	    if (superOptions !== cachedSuperOptions) {
	      // super option changed,
	      // need to resolve new options.
	      Ctor.superOptions = superOptions
	      // check if there are any late-modified/attached options (#4976)
	      const modifiedOptions = resolveModifiedOptions(Ctor)
	      // update base extend options
	      if (modifiedOptions) {
	    	extend(Ctor.extendOptions, modifiedOptions)
	      }
	      	options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
	      if (options.name) {
	    	options.components[options.name] = Ctor
	      }
	    }
	      }
	      return options
    }
首先拿到Vue.options,在Global Vue中我们可以看到，初始化Vue的时候，options的属性有下面这几个


      Vue.options.components = Object.create(null)
      Vue.options.directives = Object.create(null)
      Vue.options.filters = Object.create(null)
      Vue.options._base = Vue
      // 注意在core中只引入例如keepAlive
      // 后面2个是放在web platform中
      // 由于通常情况下，是在web环境,为了便于最大化地了解有哪些属性
      // 这里也写进去
      Vue.options.components = {keepAlive,Transition,TransitionGroup}

Ctor.super是不存在的，这个函数对于Vue的处理只提取了上面这些属性。然后将上面这些属性跟用户传入的options进行一定策略的合并，注意一件事,根组件vm.$options就是为用户传入的options跟Vue的options合并的结果。然后赋值一个Vm._renderProxy = vm,如果在开发模式上面你，会initProxy，这里主要对render函数做一个代理，如果render有错，能够及时得到反馈，通过proxy来设置has和get的trap来反馈。然后vm._self = vm;

    vm._renderProxy = vm
    vm._self = vm
走到这里根组件（后面叫root）初始化的前期工作做完。下面是一系列的函数。

    initLifecycle（vm）
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm)
    initState(vm)
    initProvide(vm)
    callHook(vm, 'created')
下面来解析针对root这一些列的初始化工作：
## initLifecycle（vm） ##
options = vm.$options，拿到$options,拿到options.parent,判断是不是抽象组件，这里不是,但是同时也没有parent因此这里不会进行$parent和$children的遍历和收集操作,vm.$parent=parent，这里没有,vm.$root = vm,vm$children = [],vm.$refs = {},vm._wathcer = null然后一些列的标志位初始化。

    const options = vm.$options // 之前合并的options
    parent = options.parent // undefined,不存在,但是注意在root组件所在的上下文中的子组件,实例化的时候，root会把自己放在里面,但是在root初始化的时候这里是undefined，任何事情总有个开头的初始化工作才有后续的操作。
    vm.$parent = parent //undefined ,针对root
    vm.$root = vm；// 这里显然就是给自己,root
    vm.$children = []
    vm.$refs = {}
    vm._watcher = null
    vm._inactive = null
    vm._directInactive = false
    vm._isMounted = false
    vm._isDestroyed = false
    vm._isBeingDestroyed = false

## initEvents(vm) ##
这个events不是dom的原生事件，而是vue的事件系统，它是通过在vm._events上维护一些方法集合，来进行on,off,once,emit操作。<br/>
对于root基本上就只做了2件事，创建一个_events对象,设置标志位_hasHookEvent = false

    vm._events = Object.create(null)
    vm._hasHookEvent = false
    listeners = vm.$options._parentListeners //这里没有_parentListener所以更新事件不执行

## initRender(vm) ##
render是要是负责创建关于渲染工作的，比如vnode的生成，比如针对dom的创建的update的绑定。下面看看初始化了哪些东西。

    vm._vnode = null
    vm._staticTrees = null
    const parentVnode = vm.$vnode = vm.$options._parentVnode // undefined
    const renderContext = parentVnode && parentVnode.context // undefined
    vm.$slots = resolveSlots(vm.$options._renderChildren, renderContext)// {}空对象
    vm.$scopedSlots = emptyObject // 空对象
    vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false) // 绑定_c用于模板解析生成的render代码中的c
    vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true) // 用于用户级的render
    const parentData = parentVnode && parentVnode.data // 我们当下这种<div><abc></abc></div>这里没有
    defineReactive(vm, '$attrs', parentData && parentData.attrs, null, true)
    defineReactive(vm, '$listeners', vm.$options._parentListeners, null, true)

最后的定义响应式，实际上就是this.$attr能够访问parentData.attrs,this.$listener能够访问vm.$options._parentListeners
## callHook(vm, 'beforeCreate') ##
beforeCreate钩子函数调用
## initInjections(vm) ##
这里就是把vm上面绑定inject对象中的属性，里面的属性值，来自于最近的拥有同样属性的parent组件，找不到值的话会一直遍历到root，比如inject:['aaa'],那么就会到parent中去找aaa，然后this.aaa = paretn.aaa
## initState(vm) ##
initState是个相当重要的阶段，基本上属于核心的初始化，在这里在vm._wathcers = [];它们做的工作基本上就是在$options中找到这几个属性，然后由于这几个属性都是options上面的，所以要么代理给vm,要么直接vm.xxx = xxx,最后保证vm.xxx能去对应的地方访问到属性，而不是vm.methods.xxx,vm._data.xxx，state这一块需要单独抽取出来写。

    vm._watchers = []
    initProps(vm, opts.props)
    initMethods(vm, opts.methods)
    initData(vm)
    initComputed(vm, opts.computed)
    initWatch(vm, opts.watch)

## initProvide(vm) ##
provide是这个组件作为parent会影响下面子组件的里面的inject的值，基本上处理inject属性，就是把inject放到vm._provided上面。

    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide
## callHook(vm, 'created') ##
运行到这里root触发created,如果有，这个时候new Vue({})的事情已经做完了那么为了显示页面需要去挂载，调用vm.$mount函数。vm.$mount函数是一个存在render就render出vnode，然后根据vnode去生成dom的过程。西面继续解析挂载的过程，只有这个过程进行了才有后续的子组件的实例创建。
## $mount ##
首先要明确的是通常我们都是写的template标签，template标签目前还没有被解析成render函数，因此针对需要complier模块去把template选项解析并生成render，同时这里也会告诉我们，直接使用render的性能会更好些，第一不需要额外引入complier，第二少了complie这个过程。但是无论如何，好用快速开发出东西，牺牲一点点性能是能够接受的，因此通常这里会有一个解析模板的过程。如果只提供了template的属性，那么需要在执行$mount之前插入一个complier的操作。举出前面的例子。<div><abc></abc></div>,这样一个模板（当然这里只是为说明情况，后续的abc的解析会增加若干个东西，来保证abc初始化的过程尽量多跑完分支代码，而不是直接跳过）最终会解析成:

    '\_c('div',[\_c('abc')])'
在浏览器中,$mount(el),这严格来说这个el属于一个dom，因此属于平台代码，但是这里也提一下，实际上这个el是通过querySelector（el）来拿到这个元素。
    el = el && query(el)
    const options = this.$options
    if (template) { 
	    const { render, staticRenderFns } = compileToFunctions(template, {
	    shouldDecodeNewlines,
	    delimiters: options.delimiters,
	    comments: options.comments
	      }, this)
	    // 转化后的render给options.reder
	      options.render = render
	    // 静态rendersFns给options.staticRenderFns
	      options.staticRenderFns = staticRenderFns
    }
上面的代码相当于把原生的mount放进了一个变量，然后把模板解析成render和staticRenderFns后，并入options，再来调用原生mount.mount由于需要更dom打交道，因此属于运行时才能决定的，因此在web-platform里面会绑定下面几个函数。

    Vue.prototype.$mount 
    Vue.prototype.__patch__ = inBrowser ? patch : noop
可以看到$mount实际上是在运行时才能决定的，原生的$mount代码很简单就是:

    Vue.prototype.$mount = function (
      el?: string | Element,
      hydrating?: boolean
    ): Component {
      el = el && inBrowser ? query(el) : undefined
      return mountComponent(this, el, hydrating)
    }
需不需要complier，这个不同版本的vue最终都不一样,比如runtime就没有complier,这里不讨论这个，总而言之options.render已经存在，因此开始调用mountComponent，现在可以回到核心代码。
## mountComponent ##
首先vm.$el = el;这里的el为一个dom元素。然后调用beforeMount钩子，调用完成后，绑定一个watcher的回调函数，这个wathcer属于vm的wathcer，它职责就是更新视图，收集新的依赖，删除已经没有的依赖，总而言之就是管理依赖。代码如下：

    vm.$el = el
    callHook(vm, 'beforeMount')
    updateComponent = () => {
      vm._update(vm._render(), hydrating)
    }
    vm._watcher = new Watcher(vm, updateComponent, noop)
watcher整体如何运行的会单独抽取出来写，这里不讨论，这里只讨论组件初始化跟dom渲染有关系的部分。在new Wacher，watcher本身也有自己的id，这样可以区分是哪个watcher，参数传入了root实例和updateComponent函数，初始化后，watcher上面的vm = 传入的组件对象，这里是root，然后在_watchers上面压入当前的watcher，相当于一个watcher大仓库收集各种watcher，然后初始化id，限于篇幅这里只讨论，跟组件初始化和dom更新有关系的部分。

    this.vm = vm
    vm._watchers.push(this)
    this.value = this.get()
 
    get（）{
       value = updateComponent.call(vm, vm)
       return value
    }
以上是wathcer初始化做的工作，基本上就是调用了updateComponent，下面来看看get()做了什么，get里面就是下面的代码:

     vm._update(vm._render(), hydrating)

## vm._render() ##
render就是生成vnode，目前options中只有render函数，而没有vnode，因此先把vm.$options中抽取3个属性出来render,staticRenderFns,_parentVnode。
    const {
      render,
      staticRenderFns,
      _parentVnode // undefined
    } = vm.$options
针对于Root,$options中的_parentVnode为undefined，然后看vm._isMounted，这里为false，不执行内部的逻辑，注意vm.$scopedSlots是在这里获取的，这里也没有,staticRenderFns这里也没有。

    if (vm._isMounted) { // 起初这里是undefined所以不执行
      // clone slot nodes on re-renders
      for (const key in vm.$slots) {
    	vm.$slots[key] = cloneVNodes(vm.$slots[key])
      }
    }
    
    //$scopedSlots最初初始化为空对象，这里由于没有_parentVnod所以不执行
    vm.$scopedSlots = (_parentVnode && _parentVnode.data.scopedSlots) || emptyObject
    // staticRenderFns为一个空[],这里初始化一个_staticTrees 
    if (staticRenderFns && !vm._staticTrees) {
      vm._staticTrees = []
    }
    // 这里在vm.$vnode上面放入_parentVnode,这里为undefined
    vm.$vnode = _parentVnode // undefined
运行到这里下面要执行render函数了，这里注意一个细节，vm.$createElement,render函数的第一个参数传入的是vm.$createElement,这里主要是针对用户自定义的render(h) {return h},由于前面的代码是使用的是\_c,它属于Vue.Prototype上面的，因此不需要依赖此参数，但是本质调用的是一样的。
    vnode = render.call(vm._renderProxy, vm.$createElement)
    vnode.parent = _parentVnode // undefined
    return vnode
下面来分析vnode的生成:
针对前面提到的'\with(this){_c('div',[\_c('abc')])}',由于with把this放在了作用域链的顶部，因此_c就是访问的this.\_c,它就是createElement。这个函数里面有嵌套函数所以在执行的顺序是:

    var vnode1 = _c('abc')
    var vnode2 = _c('div',[vnode]) 
下面来看看\c('abc')
## create-Element 这一步开始是实例化abc组件的前期工作  ##
现在要注意这个createElement的现在的第一个参数是root，vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)，createElement还进行了一次参数的标准化操作，比如第二参数默认是data，但是没有data的话难道我还要传个null来占位么，于是这里根据参数的类型可以进行适当的调整，比如data位置上的参数是个数组，那么就当这个数组为children参数，而data=null，标准化参数之后，再执行_createElement，下面开始分析。由于abc不是保留标签名，因此会走这个分支。

    if (isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
    	vnode = createComponent(Ctor, data, context, children, tag)
    }
这里会从root中的components属性中拿到对应tag的component选项，注意这里是一个options的对象，就是.vue中的export default {}，里面的东西，下面看看createComponent做了什么。
##create-Element > createComponent ##

    const baseCtor = context.$options._base //这里的的context是root，root的_base显然就是Vue
    Ctor = baseCtor.extend(Ctor) // 因为Cotr是对象，因此这里会参与执行extend然后变成构造函数
extend执行了什么，简而言之，extend就是产生了一个基于baseCtor的子类，这里baseCtor就是Vue，相当于Class VueComponent extend Vue{}，这个过程会设置对应的cid，确保构造函数的唯一性，VueComponent的方法体跟Vue一毛一样，VueComponent既然是extend的子类(后面称呼为Sub)，那么就会从Vue上面拿到它的options，将Vue.options和extendOptions（用户定义的组件选项）进行一定规则的合并，最后将其赋值给Sub.options,同时Sub.prototype会指向Super.protoType,也就是Vue实例有的属性和方法，通过Sub也能访问到，然后将Sub['super'] = Vue,然后初始化一些全局的方法，初始化props和computed，最后会设定3个属性：

    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)
将这3个属性设置上去，能够很好地区分哪些是用户给的options，哪些是Vue的options，并且密封他们合并后最终的options，备个份。最后返回一个Sub,这一切行为基本上就是实现了一个类似Class Sub extends Vue{},感觉在Vue3.0的时候这里会不会通过Class来实现。那么extend返回的是个什么呢，就是一个跟Vue一模一样实现的函数，options通过用户传入的options和Vue的options合并后的结果，实例的方法可以通过原型链来找到Vue中绑定的实例方法。
##create-Element >createComponent > 处理data##
data = data|| {};//拿到data<br/>
resolveConstructorOptions(Ctor)，该方法主要是在superOption修改的时候，重新更新options，这里Ctor是Sub函数，会找到Sub的super，也就是Vue，看上面的options跟superOptions是不是一个引用，基本上这里不会不一样，如果不一样就去拿到修改的options再来合并，也就是在Sub上去更新Vue中修改的options。<br/>
data.model:这里扶着处理里V-model。<br/>
Ctor.options.functional：是否是functional组件，如果是就去实例化FunctionalComponent，函数式组件没有state和instance。<br/>
listeners = data.on,把data.on放入到listener中，也就是标签上定义的@click自定义事件<br/>
data.on = data.nativeOn,将nativeOn放到data.on上面,作为dom生成后，去绑定成nativeEvent<br/>
是否是抽象组件,如果是抽象组件，取出data.slot,data给个空对象，值保留slot，因为抽象组件只需要props，listeners和slot。<br/>
mergeHooks(data),在data中放入hook属性，{init，insert，prepatch，destroy}<br/>
const name = Ctor.options.name || tag,拿到name。<br/>
拿到以上这些组件，基本上，vnode就可以生成了，代码如下：

    const vnode = new VNode(
	    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
	    data, undefined, undefined, undefined, context,
	    { Ctor, propsData, listeners, tag, children },
	    asyncFactory
      )

最后返回vnode，运行到这里\_c("abc"),创建完毕。接下来执行vnode2 = _c('div',[vnode])
## _c('div',[vnode]) ##
config.isReservedTag(tag),这里的是'div'是保留标签，因此直接创建Vnode。

    vnode = new VNode(
	    config.parsePlatformTagName(tag), data, children,
	    undefined, undefined, context
      )
这样<div><abc></abc></div>的vnode生成好了,下面要继续执行vm._update(vnode)。<br/>
vnode的生成的这个时候，根据template生成的代码，with（this）{aaa}，this是上下文vm，那么aaa不是字符串，aaa是变量，通过with（this）去context里面去取，相当于context.aaa,由于初始化initData，定义了getter，会触发依赖的收集，dep.depend()，这个时候收集是因为把模板有用到的变量收集，而不是一股脑全部收集起来。<br/>
相比自己写的render，字符串上面解析，with（this）这样上下文环境就匹配上去了。而render里面需要用到this，这个this，指向的是vm._renderPorxy,在初始化的时候，这个就是上下文root，因此this.aaa,就是访问root.aaa如下面的代码：

    vnode = render.call(vm._renderProxy, vm.$createElement)
    
## vm._update(vnode) ##
    vm: Component = this
    if (vm._isMounted) {
      callHook(vm, 'beforeUpdate')
    }
    const prevEl = vm.$el // querySelector的元素
    const prevVnode = vm._vnode // undefined
    const prevActiveInstance = activeInstance
    activeInstance = vm
    vm._vnode = vnode
在patch前会运行上面一段代码，由于dom还没生成，所以_isMounted还是false，vm.$el为querySelector返回的dom对象，将它给prevEl,也就是上个上一次的element，vm._node现在是undefined,activeInstance目前是个空，因为这是root的初始化，activeInstance对于_update是一个公共变量，然后把activeInstacne赋值给prevActiveInstance，然后把root赋值给activeInstance，最后把生成的新的vnode赋值给vm._vnode,也就是root的template产生的vnode，后面开始根据vnode插入dom了。


    if (!prevVnode) {
	      // initial render
	      // 第一次更新的时候patch的第一个参数传的是vm.$el
	      // 这个时候$el是query(selector)那个元素
	      vm.$el = vm.__patch__(
		    vm.$el, vnode, hydrating, false /* removeOnly */,
		    vm.$options._parentElm,
		    vm.$options._refElm
	      )
	      // no need for the ref nodes after initial patch
	      // this prevents keeping a detached DOM tree in memory (#5851)
	      vm.$options._parentElm = vm.$options._refElm = null
    }
这里因为是root的第一次_update因此这里没有prevVnode,那么执行vm.__patch__方法，__patch__方法传入了6个参数，第一个参数为querySelector的dom，第二个为生成vnode，三四参数不管，五六参数为undefined，因为dom还没生成，vm.$options._parentElm,vm.$options._refElm,下面看看patch里面做了什么.
## \_\_patch\_\_ ##
就是调用patch方法，先看看patch几个参数传了什么。第一个参数是个dom，第二参数是生成的vnode，第四个传入的是false，第五个，第六个是undefined。

    patch (oldVnode, vnode, hydrating, removeOnly, parentElm, refElm) 
vnode代表这新版本的vnode，这里由于是初始化，oldVnode还没有，vnode为之前render生成的，由于vnode存在所以这里不运行，默认设置一个InitialPatch为false，设置一个变量装Vnode，const insertedVnodeQueue = []。

    if (isUndef(vnode)) {
      // oldVnode触发DestroyerHook
      if (isDef(oldVnode)) invokeDestroyHook(oldVnode)
      return
    }
    let isInitialPatch = false
    const insertedVnodeQueue = []
下面根据oldVnode的类型来判断是怎么样的更新，这里有几种情况：
1.如果oldVnode没定义也就是undefined，那么就是子组件挂载的过程，比如<abc>挂载在root中。<br/>
2.如果oldVnode存在，那么有2种情况，如果oldVnode是Vnode类型，那么就是相当于数据修改，进行视图更新。<br/>
3.oldVnode类型为dom元素，就把这个dom元素转化成为一个空vnode，这个空的vnode以这个元素的标签名为tag，并将elm设置为这个dom。可以理解为第一次根组件渲染的时候，它的上一个元素是querySelector那个Dom，要把根组件的vnode跟这个dom转化成的vnode进行patch<br/>

    oldVnode = emptyNodeAt(oldVnode)
    const oldElm = oldVnode.elm
    const parentElm = nodeOps.parentNode(oldElm)

拿到querySelector产生的dom，拿到这个dom的parent，一般情况下这里是body。然后开始创建元素了，也就是dom。
## patch->createElm ##
现在createElm传入的几个参数,createElm(vnode,insertedVnodeQueue, oldElm._leaveCb ? null : parentElm,nodeOps.nextSibling(oldElm)),第一个参数为生成的vnode，第二参数为一个空数组，第三个参数由于oldElm并没有_leaveCb因此，第四个参数为paretnElm,第四个参数为oldElm的下个兄弟元素。

    createElm (vnode, insertedVnodeQueue, parentElm, refElm, nested)
第5个参数没有传也就是undefined，在vnode.isRootInsert = !nested,第五个参数在根组件更新的时候是true。
## patch->createElm->createComponent ##
这个createComponent基本上是只过滤vue-component组件，换句话说也就是需要实例化的组件，现在vnode为根组件div abc div,来看看做了什么。<br/>
拿到vnode的data，如果没有定义就什么也不做，没有data.hook.init什么也不做，没有vnode.componentInstance什么也不做，现在目前这些都不存在，那么开始返回的undefined，那么继续往下走。<br/>
拿到 vnode.data，vnode.children,vnode.tag

    const data = vnode.data
    const children = vnode.children
    const tag = vnode.tag

通过tag的值可以判断这是个什么组件，如果tag有，证明这是个正常的元素节点，如果没有tag那么可能是注释节点，不是注释节点，那么就是文本节点，取到vnode.text穿件成dom，然后给vnode.elm,然后把vnode.elm插入到parentElm下面refElm之前。通常这里一般不会是commetn和text，正常情况下都有tag，下面分析由tag的情况下。

    vnode.elm = nodeOps.createElement(tag, vnode)// 这里先把div创建了
    setScope(vnode) // 这里设置了用于scope的css的hash放在节点上作为属性。
tag标签属于父标签，下面开始创建children的dom。
## patch->createElm->createChildren ##
createChildren(vnode, children, insertedVnodeQueue)，这3个参数分别是生成的vnode和vnode.children和一个数组。<br/>

      function createChildren (vnode, children, insertedVnodeQueue) {
	    if (Array.isArray(children)) {
	      for (let i = 0; i < children.length; ++i) {
	    // 循环创建元素,createElement
	    createElm(children[i], insertedVnodeQueue, vnode.elm, null, true)
	      }
	    } else if (isPrimitive(vnode.text)) {
	      // children不是array,那就没有children
	      // 在vnode中拿到text
	      // 然后插到elm中
	      nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(vnode.text))
	    }
      }
以上是createChildren的逻辑，遍历children，通常来讲children是一个数组，但是很简单的文本子节点也有可能，如果是文本子节点，就直接在vnode.elm中appedn该文本节点。现在考虑children是个数组的情况。现在遍历到第一个children它是abc。下面看看渲染abc的逻辑。
## patch->createElm->createChildren->createElm (abc) ##
createElm的参数为下面，可以看到parentElm换成了vnode.elm,refElm为null，基本上都是按照子Vnode的顺序进行append操作，第一个参数为被插入的子节点的vnode，注意最后一个参数指定为了true，表示不是RootInsert，表示是children的插入。

    createElm(children[i], insertedVnodeQueue, vnode.elm, null, true)

下面就是abc的创建过程。首先来看看这一次createElm的操作,由于abc会被createComponent进行拦截，可以认为abc的dom的创建就是靠这个方法，这个方法还实例化了Vue实例。
## patch->createElm->createChildren->createElm (abc)-> createComponent ##
注意到这个insertedVnode是在patch的函数中定义的，因此可以认为，在这个vnode渲染完为止，这数组都会传递下去。

    createComponent(vnode, insertedVnodeQueue, parentElm, refElm）
这里vnode为children[i],这里为abc的vnode，insertedVnodeQueue为一个数组，parentElm为根组件vnode的tag创建的dom，refElm为null。abc作为自定义组件，是有data.hook.init这个属性的，然后执行这init

    i(vnode, false /* hydrating */, parentElm, refElm)
这里执行hook的init方法。
## patch->createElm->createChildren->createElm (abc)-> createComponent->hook.init ##
执行init方法，init的逻辑是，如果vnode现在没有componentInstance就为这个Vnode创建instance然后再挂载，如果有instance并且还有keepAlive,那么就运行prepatch，这里由于是abc的第一次创建，因此这里会componentInstanceForVnode和挂载。

    child = vnode.componentInstance = createComponentInstanceForVnode(
	    vnode,
	    activeInstance,
	    parentElm,
	    refElm
      )
    child.$mount(undefined, hydrating)

注意这里vnode是children[i],也就是abc，activeInstance为root，parentElm为root的tempalte对应的vnode的tag建立的dom，ref为null。<br/>

## patch->createElm->createChildren->createElm (abc)-> createComponent->hook.init-> createComponentInstanceForVnode ##
先拿到vnode.componentOptions,这个里面有{Ctor,children,tag,propsData,listener,children}几个属性，该方法首先进行一个option的标准化。

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
_isComponent:true,这里手动指定<br/>
parent:activeInstance,这里为root<br/>
propsData, _componentTag,_parentListeners,_renderChildren分别为componentOptions的propsData，tag，listeners，children 4个属性。<br/>
_parentVnode:为abc生成的vnode,这里为什么把它称为parentVnode是因为abc不是个有效的dom标签名，需要的abc组件里面的render产生的最终的dom，相对于abc内部的render，abc可以认为是一个parentVnode的占位符<br/>
_parentElm：传入的装有abc的外层标签的dom<br/>
refElm:这里为null<br/>
初始化完成之后，开始实例化abc了。

    return new vnodeComponentOptions.Ctor(options)

在Ctor产生的时候，已经把需要组件自身的一些options已经合并完毕，并且放在了Ctor.options上面，这里传入的options，相当于告诉这个构造器，这个组件的上下文环境是怎样。由于Ctor的函数实现与Vue完全一样，因此基本上就只调用了this._init(options)
# 这里开始abc的初始化 #
#_init#
在Vue的构造函数里面，就只有一句话,this._init(options),因此先看看_init里面做了什么。<br/>
先拿到组件的实例引用，然后在组件上绑定一个_uid,这个uid会自增，所以每个实例可以通过这个id来区分，设置一个_isVue表示这个对象是Vue实例。

    const vm: Component = this
    vm._uid = uid++
    vm._isVue = true

然后判断是否有_isComponent,一般情况下,如果是Vue-component，基本上都会传入这个属性，这个属性是在createComponent到init的时候，createInstanceForVnode的时候，并入的一个字段_isComponent = true,因此除了根组件实例，这里都会是true，具体过程见上面的createInstanceForVnode，所以这里会initInternalComponent(vm, options)。


    initInternalComponent(vm, options)

    function initInternalComponent (vm: Component, options: InternalComponentOptions) {
		  const opts = vm.$options = Object.create(vm.constructor.options)
		  // 创建一个对象,该对象的_proto_指向vm.constructor.options
		  // doing this because it's faster than dynamic enumeration.
		  // 这里这么指定值的原因的就是比动态去遍历出来效率更高
		  // 有的放矢
		  opts.parent = options.parent // 拿到parent
		  opts.propsData = options.propsData // 拿到propsData
		  opts._parentVnode = options._parentVnode // 拿到父Vnode
		  opts._parentListeners = options._parentListeners // 拿到父Listener
		  opts._renderChildren = options._renderChildren//
		  opts._componentTag = options._componentTag
		  opts._parentElm = options._parentElm
		  opts._refElm = options._refElm
		  if (options.render) {
		    opts.render = options.render
		    opts.staticRenderFns = options.staticRenderFns
		  }
	}
上面的代码可以看到基本上就是把creatComponent里面抽取出来的属性，提取出来给实例化的对象。先说说每个属性是怎么来的，这里面的属性分为根组件和非根组件
## initLifecycle ##
## initEvents ##
## initRender ##
## callHook(vm, 'beforeCreate') ##
## initInjections ##
## initState ##
## initProvide ##
## callHook(vm, 'created') ##
至此组件实例化完毕，挂不挂载，就看是否有$el属性,挂载调用vm.$mount
