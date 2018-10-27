/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { warn, extend, mergeOptions } from '../util/index'
import { defineComputed, proxy } from '../instance/state'

export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  // 每一个实例的构造器都有一个独一无二的cid,这个能确保为一个原型继承创建的子构造器
  // 并且能够缓存他们
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   */
  // 这里的extendOptions可以认识是一组Vue实例的options,返回一个函数,及构造器
  Vue.extend = function (extendOptions: Object): Function {
    // 没有传入就设为空对象
    extendOptions = extendOptions || {}
    // 把this赋值给super,this此时是Vue
    const Super = this
    // 取到Vue.cid,显然superId = 0
    const SuperId = Super.cid
    // extendOptions有没有_Ctor属性,没有就就初始化一个对象,然后赋值给cachedCtors
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    // cachedCtors里面有没有superId,有就返回,没有继续往下走
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }
    // extendOptions有没有name,没有就取Super.options.name
    const name = extendOptions.name || Super.options.name
    // 看是不是生产环境,如果是,默认情况是生产环境不需要下面这些验证
    // 下面这些问题,应该是在开发阶段就应该解决
    if (process.env.NODE_ENV !== 'production') {
      // 测试name是不是字母开头,中间包含-或者字母,如果不是就报警告
      if (!/^[a-zA-Z][\w-]*$/.test(name)) {
        warn(
          'Invalid component name: "' + name + '". Component names ' +
          'can only contain alphanumeric characters and the hyphen, ' +
          'and must start with a letter.'
        )
      }
    }
    // 这里定义了一个function,调用了this._init(options)，跟实例化Vue走了一样的过程
    const Sub = function VueComponent (options) {
      this._init(options)
    }
    // 首先把Sub的prototype设置为一个指向Super.prototype的对象
    // 这里Super是Vue
    Sub.prototype = Object.create(Super.prototype)
    // 在prototype中的.constructor设置为Sub,这个属于正常初始化prototype流程
    Sub.prototype.constructor = Sub
    // Sub.cid = cid++,这里实际上为Sub.cid赋值为1
    // 赋值完后cid变成了2
    Sub.cid = cid++
    // Sub.options设置为Vue.options和extendOptions的合并，详细见mergeOptions
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    // Sub.super = Super,这里设置为Vue
    Sub['super'] = Super

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    // 针对props 和 computed properties,我们在Vue instance上面定义了代理getters,挡在extension的时候
    // 在extend原型上面。这样避免了每次创建实例都去使用Object.defineProperty
    // 合并之后,如果Sub.options只能怪有props,就去初始化
    if (Sub.options.props) {
      initProps(Sub)
    }
    // 合并之后如果sub里面有computed,就去初始化computed
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    // 添加下面属性,让Sub也可以去extend,也可以去mixin,也可以去use
    // 第一次运行,这里拿到了Vue.extend,Vue.mixin,Vue.use方法
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // 同样也拿到了Vue.component,Vue.filter,Vue.directive这3个去全局方法
    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // 如果有name,在把name放到自己的components属性中
    // 这样就能实现递归的使用
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    // 再加几个super(这里是Vue)的几个属性的引用
    // Sub.extendOptions = {options},这里的options就是下面的options
    // Vue.extend({options});
    // 创建一个密封的选项对象,将Sub.options扩展进去{}
    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor
    // 缓存构造器,key为当前构造器的cid,值为构造函数
    cachedCtors[SuperId] = Sub
    // 返回这个构造器
    return Sub
  }
}

// 初始化props
// 遍历这个Props,然后在该构造函数的prototype的_props上面创建一个代理key
// 代理每一个props里面的属性
function initProps (Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}
// 拿到options中的computed属性
// 在computed里面拿到传入构造函数的options的computed属性
// 遍历这个属性,然后建立definecomputed属性,key:conputed[key]
function initComputed (Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
