/* @flow */

import config from '../config'
import Dep from '../observer/dep'
import Watcher from '../observer/watcher'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,
  del,
  observe,
  observerState,
  defineReactive
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isReservedAttribute
} from '../util/index'

// 用于defineProperty的配置,免得每次都写
const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,//空函数
  set: noop//空函数
}
// 代理
// sharedPropertyDefinition上面的get定义为为返回属性'souceKey.key'
// sharedPropertyDefinition上面的set定义为将'sourceKey.key' 设置为val
// 最后在target上面定义一个key属性,属性的值为sharedPropertyDefinition
// 例如target是一个有一个souceKey的属性
// 那么最后就变成了target:{souceKey:{key:xxx}}
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  if (opts.props) initProps(vm, opts.props)
  if (opts.methods) initMethods(vm, opts.methods)
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  if (opts.computed) initComputed(vm, opts.computed)
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}

// checkOptionType
// 检查一个vue实例中的props是不是一个对象
// 如果不是对象报警告
function checkOptionType (vm: Component, name: string) {
  const option = vm.$options[name]
  if (!isPlainObject(option)) {
    warn(
      `component option "${name}" should be an object.`,
      vm
    )
  }
}
// 初始化props
function initProps (vm: Component, propsOptions: Object) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  const keys = vm.$options._propKeys = []
  const isRoot = !vm.$parent
  // root instance props should be converted
  observerState.shouldConvert = isRoot
  for (const key in propsOptions) {
    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      if (isReservedAttribute(key) || config.isReservedAttr(key)) {
        warn(
          `"${key}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      defineReactive(props, key, value, () => {
        if (vm.$parent && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  observerState.shouldConvert = true
}

// 初始化data
// $options是一个vue实例属性,它里面有用户自定义传入的所有选项
// 包括非标准的属性,例如name
// 拿到$options中的data,abc一般就是个函数
// 如果data是函数先在vm上弄个_data然后赋值getData(data,vm),这里拿到了data()中返回的对象
// 如果data不是函数,就是用如果data有值,就给data,要不然就给个空对象{}
// 如果data不是一个普通的对象
//
function initData (vm: Component) {
  let data = vm.$options.data
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  if (!isPlainObject(data)) {
    // 如果data()返回的不是对象,或者data不是函数也不是对象,不是对象,又在开发模式,ok,给个警告
    // 同时将data设置为空对象
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  // 下面要开始代理data了
  // 创建一个keys的数组,这里面有data的所有属性
  // 同时也拿到props对象
  // 也拿到methods对象
  // 下面去遍历这个keys数组
  // 在开发模式中,如果methods中存在给个警告,method中没有,props中有,给个警告
  // 最后判断是否是保留字
  // 如果不是保留字,就在当前vm组件上面的_data中存入这些key的值
  // 然后observe一下
  const keys = Object.keys(data)
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length
  while (i--) {
    const key = keys[i]
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {
      proxy(vm, `_data`, key)
    }
  }
  // observe data
  observe(data, true /* asRootData */)
}

// getData方法,该方法第一个参数传入function,第二个参数传入一个vue实例对象
// 实例去调用这个data方法(),这个data方法返回了一个全新的对象
// 如果有错误抛个异常
function getData (data: Function, vm: Component): any {
  try {
    return data.call(vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  }
}

// 计算属性的默认属性,lazy是true
const computedWatcherOptions = { lazy: true }

function initComputed (vm: Component, computed: Object) {
  process.env.NODE_ENV !== 'production' && checkOptionType(vm, 'computed')
  const watchers = vm._computedWatchers = Object.create(null)

  for (const key in computed) {
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }
    // create internal watcher for the computed property.
    watchers[key] = new Watcher(vm, getter || noop, noop, computedWatcherOptions)

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}
// 定义计算属性传入3个值,第一个是对象,第二个是键,第三个是用户定义Object|Function
// 如过定义的是函数,计算属性就是函数
// sharedPropertyDefinition.get赋值为createComputedGetter(key);也就是通过key来创建一个getter
// set设置为noop,也就是没有动作
export function defineComputed (target: any, key: string, userDef: Object | Function) {
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = createComputedGetter(key)
    sharedPropertyDefinition.set = noop
  } else {
    // 如果是一个对象,按照vue官方的文档,告诉我我们,需要传入get和set两个属性
    // 有get的话,同时又userDef.cache不是false,get值为用户定义的get
    // 有get的话,同时没有userDef.cache,get就置空
    sharedPropertyDefinition.get = userDef.get
      ? userDef.cache !== false
        ? createComputedGetter(key)
        : userDef.get
      : noop
      // 用户传入set了就用set,没用的话就置为noop
    sharedPropertyDefinition.set = userDef.set
      ? userDef.set
      : noop
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
        // 在开发模式中,如果set设置了noop,这时候把noop再设置为提示警告的函数
        // 如果在使用计算属性的set,就发出警告,因为set是noop
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  // 最后在target上面定义这个key属性
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

// 通过键值来创建一个getter
// 这里用到了闭包
// 返回一个computedGetter函数
// 创建一个watcher,把key放入_computedWatchers中
// 如果watcher有值,dirty为true,就去evalute一下
// 如果watcher有值,Dep.target存在,就调用wathcer.depend()
// 最后return wathcer.value
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

// 初始化方法
// 首先如果在开发模式,methods如果不是对象就给警告
// 拿到props,如果methods中的某个属性为空,报警告
// 如果跟props里面的属性重复了,报警告
function initMethods (vm: Component, methods: Object) {
  process.env.NODE_ENV !== 'production' && checkOptionType(vm, 'methods')
  const props = vm.$options.props
  for (const key in methods) {
    vm[key] = methods[key] == null ? noop : bind(methods[key], vm)
    if (process.env.NODE_ENV !== 'production') {
      if (methods[key] == null) {
        warn(
          `method "${key}" has an undefined value in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      if (props && hasOwn(props, key)) {
        warn(
          `method "${key}" has already been defined as a prop.`,
          vm
        )
      }
    }
  }
}
// 思想,设计模式,逻辑,flow,Typescript
// 初始化watch
// 先看watch属性是不是对象,不是就给警告
// 遍历watch,在watch中找到key对应的handler
// 如果handler是个数组,遍历这个数组,然后创建createWatcher,实际上这么调用的vm.$watch(key,handler)
// 如果不是数组那就是函数，直接就vm.$watch(key,handler);
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
// 创建一个watcher,传入4个参数,vue实例,key,回调,选项
// 如果handler是对象,就拿handler.handler
// 这里如果handler是对象,就认为这个对象是个options,handler是这个options.handler
// 如果handler是个字符串,就把vm实例中的handler属性给handler
// 最后返回一个vm.$watch()
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

export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
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

  Vue.prototype.$set = set
  Vue.prototype.$delete = del

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
}
