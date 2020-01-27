# vueInstance #
组件的实例化，回到最初的时候，当初写`vue`的`template`的时候还在想为什么有`<abc></abc>`这样的标签，是不是真的创造了标签，只需要给个`components：{abc}`，就可以在`template`中写`<abc>`这样的标签，然后最终把`abc`的`options`中的`template`，替换到了这个`<abc>`标签的位置。现在简单介绍下`<abc>`标签是如何的渲染到`dom`中去的，首先在渲染`<abc></abc>`的地方，这个标签肯定也是需要写在另外一个组件(父组件)的`template`中，这个组件就是`<abc></abc>`渲染的上下文`context`，当这个`context`的`tempalte`转化成`render`函数，`render`函数运行后生成`vnode`，这个过程中发现了有一个`<abc></abc>`这么怪里怪气的标签，它不是html的约定的标签，发现这个事实后，显然它是自定义的组件，于是赶紧在上下文中的`components`中找到是不是有对应的属性，并且会对这个属性进行`hyphen化`来匹配(如果有必要)，因为html大小写不敏感，找到了之后，就拿到了对应的组件的`options`，这个`options`就可以认为是个`<abc>组件`的`options`，然后针对这个`options`来进`createComponent`(既然我是组件那么就要创建我这个组件,为了正确渲染我,abc标签不单单只是一个标签,它可能指代的是一大组标签,也就是options中的template)，因为`options`是个对象，所以使用`Ctor = baseCtor.extend(options)`，这个操作中有一些属性的合并选项的操作，相当于构建一个特定`options`对应的特定组件构造器，总而言之生成了`<abc></abc>`组件实例的构造器，接下来，拿到解析出来的`data`，通过`data`中传入的`prop`和`Ctor`中的`options.props`来把`props`从`attr`里面抽取出来，形成一个变量叫`propsData`,把`data.on`转化`listener`，`nativeOn`给`on`，因为原则上，`nativeOn`才是真正的`dom`事件，这个最终在web端dom插入后，通过遍历`on`这个对象,通过`addEventListener`，来进行`dom`的绑定，而`listener`里面属于`vue`自定义的事件模型，将他们放入`vm._events`上，然后在`data`中并入`hook`这个属性，`hook`有4个属性`{init，prepatch，inserte，destroy}`，拿到`options`中的`name`，如果没有就用`tag`代替，这也就是为什么`name`属性尽量添加上去，这样会便于定位错误和调试，最后才生成一个以`vue-component-cid-name`为名称的`vnode`，传入`context`，传入`{Ctor，propsData，listener，tag，children}`作为`compoonentInstanceOption`。`vnode`创建完毕，当后面进行`dom`创建的时候，会观察`vnode`上面有没有`hook.init`,这个是`自定义组件`特有的，然后这里会调用`init`，`init`里面会为这个`vnode`先创建`componentInstance`，通过传入作为`compoonentInstanceOption`的这些选项，进行实例化，实例化做了什么后面后面一点一点说。在实例化后，会继续`$mount`,这个`mount`是挂载到undefined上面了,它确实没有插入到任何地方，而是在内存中，因为挂载后，`elm`已经产生，而对于`context`中`tempalte`的渲染，只需要`abc`的`elm`就行了，，所以最终实例产生，对应的`$vnode`产生，同时`vnode.elm`也产生，`<abc>`组件`init`完毕，然后`insert`到`context`中指定的位置（vnode的结构能够反映父子关系），依次递归完成所有操作。下面是组件实例化的过程。<br/>
如果都到实例化这一步了，基本上可以说明，当前的组件是一个`vueComponent`所以在`Instance`创建的过程中会设置很多标志位和初始化很多后面要用到的变量和属性，下面通过源码一个个看。
#根组件的实例化#
根组件的实例化，根子组件的实例化略微有些区别，根组件的实例化，一般都会用`app = new Vue({})`,然后`app.$mount(el)`,只需要根组件挂载就够了。那么看看根组件的实例化经历了什么。这里不考虑根组件也是自定义组件，考虑根组件是个`<div><abc></abc></div>`这样的情形而不是`<abc></abc>`的情形。后面针对子组件`abc`的渲染再来执行，当然如果根组件直接是这样的`<abc></abc>`实际上就是`abc`的渲染，但是为了体现上下文的友好和上下文传递属性的直观性，先只考虑`<div><abc></abc></div>`，先渲染`<div><abc></abc></div>`再渲染`<abc></abc>`里面的内容，这样的上下文的逻辑较清晰。

    const vm: Component = this
    vm._uid = uid++
    vm._isVue = true

首先把this指向一个vm，也就是根组件实例，然后`_uid = uid++`,根组件的`uid`为0，然后`isVue`赋值为`true`，`options._isComponent`显然是没有的，于是就会运行这里。

    vm.$options = mergeOptions(
	    resolveConstructorOptions(vm.constructor),
	    options || {},
	    vm
      )

首先`mergeOptions`是就是把`Options`里面的属性进行合并，根据不同字段策略会不同，比如`hook`会把重复的值进行合并成数组，`components`，`directives`，`filters`这些会把合并的内容也就是`parent`的内容，放在`__proto__`上,`methods`,`props`,`computed`基本上是子组件有定义，就用子组件的，`data（）`因为是函数返回对象，因此合并的时候，其实是调用函数之后，再合并，以子组件的为准，`watch`跟`hook`类似，同样的字段的会合并成一个大数组。类似的这些细节在`options.js`中，并且`extend`方法里面会用到。<br/>
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

首先拿到`Vue.options`,在`Global Vue`中我们可以看到，初始化`Vue`的时候，`options`的属性有下面这几个


      Vue.options.components = Object.create(null)
      Vue.options.directives = Object.create(null)
      Vue.options.filters = Object.create(null)
      Vue.options._base = Vue
      // 注意在core中只引入例如keepAlive
      // 后面2个是放在web platform中
      // 由于通常情况下，是在web环境,为了便于最大化地了解有哪些属性
      // 这里也写进去
      Vue.options.components = {keepAlive,Transition,TransitionGroup}

`Ctor.super`是不存在的，这个函数对于`Vue`的处理只提取了上面这些属性。然后将上面这些属性跟用户传入的`options`进行一定策略的合并，注意一件事,根组件`vm.$options`就是为用户传入的`options`跟`Vue`的`options`合并的结果。然后赋值一个`Vm._renderProxy = vm`,如果在开发模式上，会`initProxy`，这里主要对`render`函数做一个代理，如果`render`有错，能够及时得到反馈，通过`proxy`来设置`has`和`get`的`trap`来反馈。然后`vm._self = vm`;

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
`options = vm.$options`，拿到`$options`,拿到`options.parent`,判断是不是抽象组件，这里不是,但是同时也没有`parent`因此这里不会进行`$parent`和`$children`的遍历和收集操作,`vm.$parent=parent`，这里没有,`vm.$root = vm`,`vm.$children = []`,`vm.$refs = {}`,`vm._wathcer = null`然后一些列的标志位初始化。

    const options = vm.$options // 之前合并的options
    parent = options.parent // undefined,不存在,但是注意在root组件所在的上下文中的子组件,实例化的时候，root会把自己放在里面,但是在root初始化的时候这里是undefined，任何事情总有个开头的初始化工作才有后续的操作。
    vm.$parent = parent //undefined ,相对root来说没有parent
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
这个`events`不是`dom`的原生事件，而是`vue`的事件系统，它是通过在`vm._events`上维护一些方法集合，来进行on,off,once,emit操作。<br/>
对于`root`基本上就只做了2件事，创建一个`_events`对象,设置标志位`_hasHookEvent = false`

    vm._events = Object.create(null)
    vm._hasHookEvent = false
    listeners = vm.$options._parentListeners //这里没有_parentListener所以更新事件不执行

## initRender(vm) ##
`render`是要是负责创建关于渲染工作的，比如vnode的生成，比如针对dom的创建的update的绑定。下面看看初始化了哪些东西。

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

最后的定义响应式，实际上就是`this.$attr`能够访问`parentData.attrs`,`this.$listener`能够访问`vm.$options._parentListeners`
## callHook(vm, 'beforeCreate') ##
beforeCreate钩子函数调用
## initInjections(vm) ##
这里就是把vm上面绑定inject对象中的属性，里面的属性值，来自于最近的拥有同样属性的parent组件，找不到值的话会一直遍历到root，比如`inject:['aaa']`,那么就会到`parent`中去找`aaa`，然后`this.aaa = paretn.aaa`
## initState(vm) ##
`initState`是个相当重要的阶段，基本上属于核心的初始化，在这里在`vm._wathcers = []`;它们做的工作基本上就是在`$options`中找到这几个属性，然后由于这几个属性都是`options`上面的，所以要么代理给vm,要么直接`vm.xxx = xxx`,最后保证`vm.xxx`能去对应的地方访问到属性，而不是`vm.methods.xxx`,`vm._data.xxx`，`state`这一块需要单独抽取出来写。

    vm._watchers = []
    initProps(vm, opts.props)
    initMethods(vm, opts.methods)
    initData(vm)
    initComputed(vm, opts.computed)
    initWatch(vm, opts.watch)

## initProvide(vm) ##
provide是这个组件作为parent会影响下面子组件的里面的inject的值，基本上处理inject属性，就是把inject里面的值作为键值然后在`vm._provided`上面找,elementUI里面经常是用`this`当成provide,也就parent组件的所有值都provide给了child。

    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide

## callHook(vm, 'created') ##
运行到这里root触发created,如果有，这个时候new Vue({})的事情已经做完了那么为了显示页面需要去挂载，调用`vm.$mount`函数。`vm.$mount`函数是一个存在`render`就render出vnode，然后根据vnode去生成dom的过程。下面继续解析挂载的过程，只有这个过程进行了才有后续的子组件的实例创建。
## $mount ##
首先要明确的是通常我们都是写的template标签，template标签目前还没有被解析成render函数，因此针对需要complier模块去把template选项解析并生成render，同时这里也会告诉我们，直接使用render的性能会更好些，第一不需要额外引入complier，第二少了complie这个过程。但是无论如何，好用快速开发出东西，牺牲一点点性能是能够接受的，因此通常这里会有一个解析模板的过程。如果只提供了template的属性，那么需要在执行$mount之前插入一个complier的操作。举出前面的例子。`<div><abc></abc></div>`,这样一个模板（当然这里只是为说明情况，后续的abc的解析会增加若干个东西，来保证abc初始化的过程尽量多跑完分支代码，而不是直接跳过）最终会解析成:

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

可以看到`$mount`实际上是在运行时才能决定的，原生的$mount代码很简单就是:

    Vue.prototype.$mount = function (
      el?: string | Element,
      hydrating?: boolean
    ): Component {
      el = el && inBrowser ? query(el) : undefined
      return mountComponent(this, el, hydrating)
    }

需不需要complier，这个不同版本的vue最终都不一样,比如runtime就没有complier,这里不讨论这个，总而言之`options.render`已经存在，因此开始调用mountComponent，现在可以回到核心代码。
## mountComponent ##
首先vm.$el = el;这里的el为一个dom元素。然后调用beforeMount钩子，调用完成后，绑定一个watcher的回调函数，这个wathcer属于vm的wathcer，它职责就是更新视图，收集新的依赖，删除已经没有的依赖，总而言之就是管理依赖。代码如下：

    vm.$el = el
    callHook(vm, 'beforeMount')
    updateComponent = () => {
      vm._update(vm._render(), hydrating)
    }
    vm._watcher = new Watcher(vm, updateComponent, noop)

watcher整体如何运行的会单独抽取出来写，这里不讨论，这里只讨论组件初始化跟dom渲染有关系的部分。在new Wacher，watcher本身也有自己的id，这样可以区分是哪个watcher，参数传入了root实例和updateComponent函数，初始化后，watcher上面的vm = 传入的组件对象，这里是root，然后在`_watchers`上面压入当前的watcher，相当于一个watcher大仓库收集各种watcher，然后初始化id，限于篇幅这里只讨论，跟组件初始化和dom更新有关系的部分。

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
render就是生成vnode，目前options中只有render函数，而没有vnode，因此先把vm.$options中抽取3个属性出来render,staticRenderFns,`_parentVnode`。

    const {
      render,
      staticRenderFns,
      _parentVnode // undefined
    } = vm.$options

针对于`Root,$options`中的`_parentVnode`为undefined，然后看`vm._isMounted`，这里为false，不执行内部的逻辑，注意`vm.$scopedSlots`是在这里获取的，这里也没有,staticRenderFns这里也没有。

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

运行到这里下面要执行render函数了，这里注意一个细节，`vm.$createElement`,render函数的第一个参数传入的是`vm.$createElement`,这里主要是针对用户自定义的`render(h) {return h}`,由于前面的代码是使用的是\_c,它属于Vue.Prototype上面的，因此不需要依赖此参数，但是本质调用的是一样的。

    vnode = render.call(vm._renderProxy, vm.$createElement)
    vnode.parent = _parentVnode // undefined
    return vnode

下面来分析vnode的生成:
针对前面提到的'\with(this){_c('div',[\_c('abc')])}',由于with把this放在了作用域链的顶部，因此_c就是访问的this.\_c,它就是createElement。这个函数里面有嵌套函数所以在执行的顺序是:

    var vnode1 = _c('abc')
    var vnode2 = _c('div',[vnode]) 
下面来看看\c('abc')
## create-Element 这一步开始是实例化abc组件的前期工作  ##
现在要注意这个`createElement`,现在的第一个参数是`root`，`vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)`，`createElement`还进行了一次参数的标准化操作，比如第二参数默认是`data`，但是没有`data`的话难道我还要传个`null`来占位么，于是这里写了一段适配逻辑，根据参数的类型可以进行适当的调整，比如`data`位置上的参数是个数组，那么就当这个数组为`children`参数，而`data=null`，标准化参数之后，再执行`_createElement`，下面开始分析。由于`abc`不是保留标签名，因此会走这个分支,这里渲染`<abc>`肯定有个一个上下文,`<abc>`标签存在于根组件的模板中，这个上下文就是根组件，为什么需要这个上下文，因为有些状态是需要父子组件进行传递的，同时上下级的层级关系也能够明确。

    if (isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
    	vnode = createComponent(Ctor, data, context, children, tag)
    }

这里会从`root`中的`components`属性中拿到对应`tag`的`component`选项,比如现在这个tag叫abc，注意这里是一个`options`的对象，就是`.vue`中的`export default {}`里面的东西，下面看看`createComponent`做了什么。

##create-Element > createComponent ##

    const baseCtor = context.$options._base //这里的的context是root，root的_base显然就是Vue
    Ctor = baseCtor.extend(Ctor) // 因为Ctor是对象，因此这里会参与执行extend然后变成构造函数

`extend`执行了什么，简而言之，`extend`就是产生了一个基于`baseCtor`的子类，这里`baseCtor`就是Vue，相当于`Class VueComponent extend Vue{}`，这个过程会设置对应的`cid`，确保构造函数的唯一性，`VueComponent`的方法体跟`Vue`一毛一样，`VueComponent`既然是extend的子类(后面称呼为Sub)，那么就会从`Vue`上面拿到它的`options`，将`Vue.options`和`extendOptions`（用户定义的组件选项）进行一定规则的合并，最后将其赋值给`Sub.options`,同时`Sub.prototype`会指向`Super.protoType`,也就是所有的`Vue`实例有的通用属性和方法，然后将`Sub['super'] = Vue`,然后初始化一些全局的方法，初始化`props`和`computed`，最后会设定3个属性：

    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

将这3个属性设置上去，能够很好地区分哪些是用户给的`options`，哪些是Vue的`options`，并且密封他们合并后最终的options，备个份。最后返回一个Sub,这一切行为基本上就是实现了一个类似`Class Sub extends Vue{}`,感觉在Vue3.0的时候这里会不会通过Class来实现。那么extend返回的是个什么呢，就是一个跟`Vue`构造函数一模一样实现的函数，只是比Vue的基本构造函数多了用户传入的属性,`最终sub的options`它由用户传入的`options`和`Vue`的初始`options`按一定策略合并之后的结果，实例的方法可以通过原型链来找到`Vue`中绑定的通用方法，这些方法大多以`$`开头。

##create-Element > createComponent > 处理data##

data = data || {}; // 拿到data

resolveConstructorOptions(Ctor)，该方法主要是在superOption修改的时候，重新更新options，这里Ctor是Sub函数，会找到Sub的super，也就是Vue，看上面的options跟superOptions是不是一个引用，基本上这里不会不一样，如果不一样就去拿到修改的options再来合并，也就是在Sub上去更新Vue中修改的options。

data.model:这里负责处理里V-model。

Ctor.options.functional：是否是functional组件，如果是就去实例化`FunctionalComponent`，函数式组件没有`state`和`instance`。

listeners = `data.on`,把`data.on`放入到listener中，也就是标签上定义的`@click`这样的事件

data.on = `data.nativeOn`,将`nativeOn`放到`data.on`上面,作为dom生成后，去绑定成`nativeEvent`

是否是抽象组件,如果是抽象组件，取出data.slot,data给个空对象，值保留slot，因为抽象组件只需要props，listeners和slot。

mergeHooks(data),在data中放入hook属性，{init，insert，prepatch，destroy}

const name = Ctor.options.name || tag,拿到name。

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

在Ctor产生的时候，已经把需要组件自身的一些options已经合并完毕，并且放在了Ctor.options上面，这里传入的options，相当于告诉这个构造器，这个组件的上下文环境是怎样。由于Ctor的函数实现（Sub）与Vue完全一样，因此基本上就只调用了this._init(options)
# 这里开始abc的初始化 #
#_init(这是Vue.extend得到的函数,跟Vue不是同一个,但是拥有Vue的所有功能,后续的所有初始化的工作和实例方法可以认为都是跟Vue一样的,因为在extend生成Ctor的时候,进行了原型链的绑定)#
在Vue的构造函数里面，就只有一句话,this._init(options),因此先看看_init里面做了什么。<br/>
先拿到组件的实例引用，然后在组件上绑定一个_uid,这个uid会自增，所以每个实例可以通过这个id来区分，设置一个_isVue表示这个对象是Vue实例。

    const vm: Component = this
    vm._uid = uid++
    vm._isVue = true

然后判断是否有_isComponent,一般情况下,如果是Vue-component，基本上都会传入这个属性，这个属性是在createComponent到init的时候，createInstanceForVnode的时候给出的,这个相当于是对自定义组件一种标志位，固定指定一个字段_isComponent = true,因此除了根组件实例，options中会存在_isComponent并且会是true，具体过程见上面的createInstanceForVnode，所以这里会initInternalComponent(vm, options)。

    if (options && options._isComponent) {
       initInternalComponent(vm, options)
    }

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
		  opts._renderChildren = options._renderChildren// 拿到children
		  opts._componentTag = options._componentTag // 拿到tag,注意这个componentTag是一个自定义的tag，原生的element标签不会走到这里来
		  opts._parentElm = options._parentElm// 这个是root里面最根的元素比如<div><abc></abc></div>,这个相当于是<div>
		  opts._refElm = options._refElm // _ref相当于是null,这里是处理abc的过程,abc属于外层<div>的children,对于children按顺序append了不需要指定refElm,因此这里是null
          // 如果options有render,通常来说这里没有render
          // 等到abc进行mount的时候才有
		  if (options.render) {
		    opts.render = options.render
		    opts.staticRenderFns = options.staticRenderFns
		  }
	}
    vm._renderProxy = vm
    vm._self = vm
上面的代码可以看到基本上就是把creatComponent里面抽取出来的属性，再次并入到abc的构造函数中，这些属性起到了该组件渲染的上下文，dom的上下文的一些信息。然后设置一个_renderProxy。然后开始新一轮的实例的初始化。针对这些parentElm，现在来插播一个东西，就是为什么vue会要求template只能有一个根元素呢，这是因为基于vnode的模型设计，vnode有text，tag，children，三个同级属性，比如存在text，就表示这是一个文本节点，如果有tag，显然就没有text，因为有tag，可以认为是"Element"( 打引号的原因是如果是html原生标签，那么就是element)，因此vnode的结果非常清晰，就是只能有一个父标签，这个tag只能存一个标签名，如果tempalte的根标签，有多个标签同级，那么这个tag的值就不能确定了，最后会什么也进行不下去了。基于单tag，我个人认为还有利于自定义组件的渲染，比如<abc></abc>，我通过这个tag:'abc'，通过这个abc去找component，做到了一一对应，同时abc可以做唯一的parentVnode,不需要管别的同级的标签。
## initLifecycle ##
拿到$options,这个时候的options，包含了哪些信息，下面来依依列举出来。
1.Vue构造函数的的options属性。（superOptions）<br/>
2.用户传入的options属性。（extendOptions）<br/>
3.关于组建上下文一些信息.(internalComponentOptions，就是上面方法里面的那些属性)<br/>
拿到parent,parent为root，然后root.$children.push(vm(abc组件实例)),然后把在abc组件上设置好$parent,$root,$children,$ref等，还是老套路跟根组件一样，如下所示。

    parent = options.parent
    parent.$children.push(vm)
    vm.$parent = parent
    vm.$root = parent.$root
    vm.$children = []
    vm.$refs = {}
    vm._watcher = null
    vm._inactive = null
    vm._directInactive = false
    vm._isMounted = false
    vm._isDestroyed = false
    vm._isBeingDestroyed = false

## initEvents ##
    vm._events = Object.create(null)
    vm._hasHookEvent = false
    const listeners = vm.$options._parentListeners
      if (listeners) {
         updateComponentListeners(vm, listeners)
      }
不同于根组件，由于根组件只是个div而已，也不能在parentListener,但是abc不是根组件，所以这里为了说明这些逻辑，下面要改下组件模板来说明。前面为了简化为题认为渲染的就是<div><abc></abc></div>,现在到了渲染event了，如果按照这个模板来，是没有listener的，因此这里要根据不同的阶段，为了让代码都跑到位，现在来加一点点event。<div><abc @myEvent = "aaa" @click.native="bbb"></abc></div>,假如我们的模板是这样的，那么实际上这个listener就是:{myEvent:aaa},所以这里带着这个listener对象去updateComponentListeners（）,updateComponentListener的具体细节在单独的event里面写，这里描述一下大概的流程，就是在vm._events上面加入这些属性上面的值，通过this.$emit去调用。具体过去在events里面去写。
## initRender ##
    vm._vnode = null
    vm._staticTrees = mull
    const parentVnode = vm.$vnode = vm.$options._parentVnode
    const renderContext = parentVnode && parentVnode.context
    vm.$scopedSlots = emptyObject
    vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
    vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)
    
    const parentData = parentVnode && parentVnode.data
    defineReactive(vm, '$attrs', parentData && parentData.attrs, null, true)
    defineReactive(vm, '$listeners', vm.$options._parentListeners, null, true)
下面看看render里面做了什么，render显然是处理关于渲染这一部分的东西，比如vnode的渲染，所以会初始化一个_vnode,_staticTrees,拿到abc这个节点vnode，拿到abc这个节点的上下文，也就是root，设置一个空对象给$scopedSlots,我这个版本不支持scopedSlot，关于scopedSlots放在单独的slot里面去分析。然后绑定createElement这2个函数，非要在vm上面绑定，是因为每一个render的上下文都必须是当前实例，然后看parentVnode里面有没有data，有data，然后在vm上面定义2个响应式属性，vm.$attr 能够访问到parentData.attrs,vm.$listeners能够访问到vm.$options._parentListeners。attr是什么，比如id他就是attr，例如如果<abc :bb="ccc"></abc>同时在props中没有定义这个bb，因此这个bb就是attr，{bb:ccc},会放进vm.$attr
## callHook(vm, 'beforeCreate') ##
运行到这里beforeCreate完毕，调用这个钩子。
## initInjections ##
initInjecttions跟父组件一样的逻辑，就是找到最近的在父元素的_provided对象中具有同名属性的属性，拿到这个值，赋值给这个inject里面的属性。
## initState ##

    vm._watchers = []
    initProps(vm, opts.props)
    initMethods(vm, opts.methods)
    initData(vm)
    initComputed(vm, opts.computed)
    initWatch(vm, opts.watch)
跟父组件一毛一样，具体的渲染，单独拆开来写，这里的总体逻辑就是把options中的props，methods，data（），computed，watch这些合并到vm上面来。能够通过vm.xxx来调用。
## initProvide ##
provide就是运行这个函数，或者非函数，建立一个_provide来装provide里面的对象键值对，供子组件去找。
## callHook(vm, 'created') ##
调用created钩子，表示组件实例已经创建完毕。
### patch->createElm->createChildren->createElm (abc)-> createComponent->hook.init->child.$mount(undefined, hydrating) ###
实例创建完毕就开始挂载,注意这里的挂载对象是undefined。为了代码的分析需要，这里给定abc组件的template为:    
    <div>abc</div>
那么现在开始abc组件的$mount,跟前面一样，由于是web平台，且提供的是template选项，那么mount会被加入一些前置逻辑，比如生成render，前置逻辑基本上就是简单的加一个render和staticRenderFns，加完之后，开始调用core文件夹中的mountComponent这个函数。

    vm.$el = el // 这里是undefined
    callHook(vm, 'beforeMount') // 调用beforeMount
    updateComponent = () => {
      vm._update(vm._render(), hydrating)
    }
跟父组件一样，这里会设置$el,只有根组件这里会有元素，根组件下面的子元素为undefined，然后调用beforeMount,设置watcher的回调，实例化watcher，跟前面一样，实例化watcher，会伴随的回调函数的执行也就是_render和_update。对于_render就是通过abc的template生成的render或者自定义的render，前提是有render，通过render来创建出vnode,创建vnode的时候，会收集这个模板需要的依赖，_update会通过这个vnode来创建对应的dom，render的过程跟root一样，_update这里跟父组件有点不一样，因为挂载的目标元素是undefined。在_update也就是更新dom的前期，会把activeInstance换掉，这里很关键，因为<abc></abc>里面还有可能有<bcd></bcd>这样的组件，比如<abc></abc>的模板是<div><bcd></bcd></div>，而<bcd></bcd>组件的渲染，它的上下文是abc,父组件是abc，组件实例的parent应该是abc的实例，通常赋值都是用activeInstance,将它作为一个渲染的共享变量，标志当前组件的父组件实例,当然对于根组件这activeInstance为null，因此这里activeInstance会赋值为abc的实例，将render后的vnode给vm._vnode,所以对于abc这样的组件，他的_parentVnode为tag:"vue-component-abc",vm._vnode为abc选项中render产生的vnode，注意$vnode为_parentVnode。由于都是第一次更新，因此,prevVnode肯定没有，于是会运行下面的代码:

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

注意这里跟根组件不同的在于，由于创建abc的实例的时候，给了一些internalComponentOptions,比如_parentElm,这个就是<div\><abc\></abc\></div\>中的<div\></div\>,refElm为null,vm.$el=undefined。下面来运行\_\_patch\_\_。
## abc组件的patch ##
      let isInitialPatch = false
      const insertedVnodeQueue = []
      if (isUndef(oldVnode))  {
            isInitialPatch = true
            createElm(vnode, insertedVnodeQueue, parentElm, refElm)
      }

由于oldVnode为undefined,所以这里会执行createElm(vnode, insertedVnodeQueue, parentElm, refElm),假设这里模板为：

    <div>abc</div>

    vnode.isRootInsert = !nested为true,
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return
    }
以上代码由于模板中不存在vue-component（没有data.hook.init），因此这里执行createComponent会为false,所以代码会继续往下走。

    const data = vnode.data
    const children = vnode.children
    const tag = vnode.tag
为了简化，针对上面简单模板，data没有，children为一个文本节点vnode，tag为div。

    vnode.elm = nodeOps.createElement(tag, vnode)
    setScope(vnode)
以上代码创建了div元素,然后设置了css的scoped的hash
    createChildren(vnode, children, insertedVnodeQueue)
    if (isDef(data)) { 
    	invokeCreateHooks(vnode, insertedVnodeQueue)
    }
    insert(parentElm, vnode.elm, refElm)
以上代码拿到带有elm属性的vnode，children，开始创建createChildren。

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
也就是以children[i]为vnode,vnode.elm为parent，最后的nest设置为true,表示在嵌套插入子元素。循环调用createElm，由于div元素中的abc是文本节点，因此只会运行下面这两句。

      vnode.elm = nodeOps.createTextNode(vnode.text)
      insert(parentElm, vnode.elm, refElm) // <div>abc</div>，abc的dom已经创建完毕

所以createChildren，不但创建了子元素，同时也插入了子元素。abc的dom已经渲染完毕了。

    root <div><abc></abc></div>
    
    abc  <div>abc</div>
    // 当abc的dom完成时,开始渲染platform的一些东西,比如加上原生事件,style,class
    // 这些都放在了create这个钩子函数中
    abc  patch invokeCreateHooks(vnode, insertedVnodeQueue)
    // 平台特性的东西渲染完毕后,开始插入到这里的根元素为root中的div
    abc  patch insert(parentElm, vnode.elm, refElm)
    //  insert钩子函数的执行,这里主要是针对diretive，transition的一些过度效果
    abc  patch invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
    // root的createChildren渲染完毕
    abc  mountComponent vm._isMounted = true
    abc  mountComponent callHook(vm, 'mounted')


    root  patch invokeCreateHooks(vnode, insertedVnodeQueue)
    root  patch insert(parentElm, vnode.elm, refElm) // 这里的parentElm为$el的parent，一般是body元素,这里的refElm为$el.nextSibling
    // 所以最终最插入到body中,$el的nextSibling之前，也就是$el后面,$el.nextSibling之前
    root  removeVnodes(parentElm, [oldVnode], 0, 0) // 删除$el
    root  patch invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
    root  mountComponent vm._isMounted = true
    root  mountComponent callHook(vm, 'mounted')


运行到这里,初始化完毕,运行时的dom专门再去写。
## 修改属性,触发dom重新渲染的过程 ##
这部分放在这里写的原因,在于前面整理了初始化的脉络,有了这些铺垫，change state的过程就比较容易了。响应式的原理这里不探究，准备单独列出来写,这里只写修改state触发一系列视图修改的过程。当修改一个数据的时候,如果这个数据被视图所依赖,那么这个数据会notify(),通知使用过这个依赖的每个watcher，然后在watcher里面异步跟新视图,通过microTask,Promise.resolve().then（循环运行watcher的run函数）,最终视图dom的更新运行的是绑定在wathcer上面的getter函数，也及时updateComponent。
    
    // watcher中存有一个属性vm,针对vm中的视图的专属watcher
    // vm._watcher也能引用到这个watcher
    // watcher也能找到它服务的vm
    const vm = this.vm
    value = this.getter.call(vm, vm)
    // getter就是updateComponent
    updateComponent = () => {
          vm._update(vm._render(), hydrating)
    }
vm._render()通过修改后的数据,生成了新的视图,过程如上面一样，然后把新生成的vnode传给_update()<br/>

    const vm = this
    if (vm._isMounted) {
      callHook(vm, 'beforeUpdate') // 如果挂载好的，这里会调用beforeUpdate
    }
    const prevEl = vm.$el
    const prevVnode = vm._vnode
    const prevActiveInstance = activeInstance
    activeInstance = vm
    vm._vnode = vnode
拿到老的dom,老的\_vnode,被更新的组件的vm作为activeInstance,之前的存入prevActiveInstance,然后把新生成的vnode赋值给vm.\_vnode

    vm.$el = vm.__patch__(prevVnode, vnode)
下面分析一下patch这一次做了什么
    patchVnode(oldVnode, vnode, insertedVnodeQueue, removeOnly)
    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
patch的内容这里就不分析了，这个是diff算法的内容，专门抽取一章出来分析,通过patch能够在新的vnode的基础上去改造旧的dom，改造完毕，调用insertHook。最后注意下这里：
    if (prevEl) {
      prevEl.__vue__ = null
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    // 如果parent是个高阶组件,跟新它的$el
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
前面2个if表示,如果老dom存在把\_\_vue\_\_设置为null,在最新的元素节点上给一个vm的引用叫\_\_vue\_\_，updated hook,在flushQueue的时候进行调用,在scheduler.js中，第三句话的意思是:

    <aaa><abc><bbb></bbb></abc></aaa>

出现了这种情况,aaa会有一个vm,abc会有一个vm,bbb也会有个vm,但是它们的最终渲染的dom都是bbb的render对应的dom,因此它们3个的$el应该一样。

    vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode
