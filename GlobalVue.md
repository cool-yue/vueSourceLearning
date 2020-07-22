## Global Vue ##
在2.x的版本中,Vue在初始化的时候，并入了所有的全局方法，不管用没用到，在3.x的版本的时候尤大大会重写成为模块化版本，按需引入，但是也有必要搞清楚Global Vue在初始化的时候到底并入了哪些东西。下面通过源码来进行分析。在vue的核心源码中，index.js调用的有：

    import Vue from './instance/index'
    import { initGlobalAPI } from './global-api/index'

根据这个线索看一看到底是如何初始化的,先看第一行,instance的index。

    function Vue (options) {
	      if (process.env.NODE_ENV !== 'production' &&
	     	!(this instanceof Vue)
	      ) {
	    	warn('Vue is a constructor and should be called with the `new` keyword')
	      }
	      	this._init(options)
    }
    
    initMixin(Vue)  // 这里仅仅在Vue.prototype上面引入了_init这个方法,这个方法主要是执行了一个vue是实例实例化的过程中所有的东西，例如钩子，属性处理，初始化
    stateMixin(Vue) // 在Vue原型属性上定义了几个属性,Vue.prototype.$data,Vue.protoType.$props,Vue.protoType.$set,Vue.protoType.$delete,Vue.protoType.$watch
    eventsMixin(Vue) // 在Vue原型属性上定义了几个属性,Vue.protoType.$on,Vue.protoType.$once,Vue.protoType.$off,Vue.protoType.$emit
    lifecycleMixin(Vue) // 在Vue原型属性上定义了几个属性,Vue.protoType._update,Vue.protoType.$forceUpdate,Vue.protoType.$destroy
    renderMixin(Vue)

首先看到Vue整个的构造函数只写了一句话this._init(options);这里先不管,来看看后面几个对于全局Vue混入了什么。
# instance #
## initMixin ##
定义`Vue.prototype._init`
## stateMixin ##
在`Vue.prototype`上面定义`$data`和`$props`属性，并且定义了配套的set和get方法。比如`aaa = new Vue();`,`a.$data`实际上最后访问的是`a._data`,然后`aaa.$props`最后访问的是`aaa._props`,同时对于set，比如`aaa.$props = 新值`,那么实际上并不能设定。这也就是为什么`this.$data`可以访问data()产生的对象的原因，this.$props能访问props的原因。

     const dataDef = {}
      dataDef.get = function () { return this._data }
      const propsDef = {}
      propsDef.get = function () { return this._props }
      if (process.env.NODE_ENV !== 'production') {
    	dataDef.set = function (newData: Object) {
      	warn(
	    	'Avoid replacing instance root $data. ' +
	    	'Use nested data properties instead.',
    	this
      	)
    	}
    	propsDef.set = function () {
      	    warn(`$props is readonly.`, this)
    	}
      }
      Object.defineProperty(Vue.prototype, '$data', dataDef)
      Object.defineProperty(Vue.prototype, '$props', propsDef)

然后定义`$set`，`$delete`和`$watch`方法

    Vue.prototype.$set = set
    Vue.prototype.$delete = del
    Vue.prototype.$watch = fn

## eventsMixin ##

由于是核心代码，因此这里定义的事件其实是针对`vue-compoent`的自定义事件，对于dom上面的原生事件，这里不参与，因为那个是与平台相关的。定义了4个方法，这4个方法的核心思路就是在`vm._event`里面存回调函数,事件名作为键,值是一个装有函数的数组，然后通过`push`来收集，通过循环遍历去调用，通过将`_events`置空来清空

    Vue.prototype.$on
    Vue.prototype.$once
    Vue.prototype.$off
    Vue.prototype.$emit

## lifecycleMixin ##

    Vue.prototype._update
    Vue.prototype.$forceUpdate
    Vue.prototype.$destroy

## renderMixin ##

这里存放跟渲染相关的方法
    Vue.prototype.$nextTick
    Vue.prototype._render

    Vue.prototype._o = markOnce
    Vue.prototype._n = toNumber
    Vue.prototype._s = toString
    Vue.prototype._l = renderList
    Vue.prototype._t = renderSlot
    Vue.prototype._q = looseEqual
    Vue.prototype._i = looseIndexOf
    Vue.prototype._m = renderStatic
    Vue.prototype._f = resolveFilter
    Vue.prototype._k = checkKeyCodes
    Vue.prototype._b = bindObjectProps
    Vue.prototype._v = createTextVNode
    Vue.prototype._e = createEmptyVNode
    Vue.prototype._u = resolveScopedSlots
    Vue.prototype._g = bindObjectListeners

# Global-api #

在Vue上面定义一个叫config的属性，该属性不可以set

      const configDef = {}
      configDef.get = () => config
      // 在开发模式里面,要给个set函数,就是不让开发过程中去修改
      if (process.env.NODE_ENV !== 'production') {
      configDef.set = () => {
      	warn(
    		'Do not replace the Vue.config object, set individual fields instead.'
      		)
    	}
      }
      // 然后全局对象绑定一个config
      Object.defineProperty(Vue, 'config', configDef)

引入4一个工具属性:

      Vue.util = {
        warn,
        extend,
        mergeOptions,
        defineReactive
      }

绑定3个全局函数，实例上也有：

      Vue.set = set
      Vue.delete = del
      Vue.nextTick = nextTick

创建一个Vue.options属性：
      Vue.options = Object.create(null)

## Vue.options有哪些东西 ##
      Vue.options.components = Object.create(null)
      Vue.options.directives = Object.create(null)
      Vue.options.filters = Object.create(null)
      Vue.options._base = Vue
      // 注意在core中只引入例如keepAlive
      // 后面2个是放在web platform中
      // 由于通常情况下，是在web环境,为了便于最大化地了解有哪些属性
      // 这里也写进去
      Vue.options.components = {keepAlive,Transition,TransitionGroup}

options的合并是Vue初始化过程中经常要进行的，而很多时候为什么全局的注册的东西，局部可以用就是因为，Vue.options的内容会和实例初始化options里面同名的内容进行合并
## initUse ##

      Vue.use = fn
## initMixin ##

      Vue.mixin = fn 
## initExtend ##

      Vue.extend
## initAssetRegisters ##

      Vue.component
      Vue.directive
      Vue.filter

这3个全局方法，会把注册的component，directive，filter分别放进Vue.options.components，Vue.options.directives和Vue.options.filters.
