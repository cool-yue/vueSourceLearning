/* @flow */

import config from '../config'
import { warn } from './debug'
import { nativeWatch } from './env'
import { set } from '../observer/index'

import {
  ASSET_TYPES,
  LIFECYCLE_HOOKS
} from 'shared/constants'

import {
  extend,
  hasOwn,
  camelize,
  capitalize,
  isBuiltInTag,
  isPlainObject
} from 'shared/util'

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 */
const strats = config.optionMergeStrategies  // 默认是个空数组

/**
 * Options with restrictions
 */
if (process.env.NODE_ENV !== 'production') {
  // 如果不是生产环境,在strats.propsData上绑定一个函数,这个函数返回defaultStrat()，形成一个闭包
  // 如果不是生产环境,在strats.el上绑定一个函数,这个函数返回defaultStrat()，形成一个闭包
  strats.el = strats.propsData = function (parent, child, vm, key) {
    if (!vm) {
      warn(
        `option "${key}" can only be used during instance ` +
        'creation with the `new` keyword.'
      )
    }
    return defaultStrat(parent, child)
  }
}

/**
 * Helper that recursively merges two data objects together.
 */
// 递归地合并2个对象,并且返回这个对象
function mergeData (to: Object, from: ?Object): Object {
  if (!from) return to
  let key, toVal, fromVal
  const keys = Object.keys(from)
  for (let i = 0; i < keys.length; i++) {
    key = keys[i]
    toVal = to[key]
    fromVal = from[key]
    if (!hasOwn(to, key)) {
      set(to, key, fromVal)
    } else if (isPlainObject(toVal) && isPlainObject(fromVal)) {
      mergeData(toVal, fromVal)
    }
  }
  return to
}

/**
 * Data
 */
export function mergeDataOrFn (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  if (!vm) {
    // in a Vue.extend merge, both should be functions
    if (!childVal) {
      return parentVal
    }
    if (!parentVal) {
      return childVal
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    return function mergedDataFn () {
      return mergeData(
        typeof childVal === 'function' ? childVal.call(this) : childVal,
        typeof parentVal === 'function' ? parentVal.call(this) : parentVal
      )
    }
  } else if (parentVal || childVal) {
    return function mergedInstanceDataFn () {
      // instance merge
      const instanceData = typeof childVal === 'function'
        ? childVal.call(vm)
        : childVal
      const defaultData = typeof parentVal === 'function'
        ? parentVal.call(vm)
        : undefined
      if (instanceData) {
        return mergeData(instanceData, defaultData)
      } else {
        return defaultData
      }
    }
  }
}

strats.data = function (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  if (!vm) {
    if (childVal && typeof childVal !== 'function') {
      process.env.NODE_ENV !== 'production' && warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.',
        vm
      )

      return parentVal
    }
    return mergeDataOrFn.call(this, parentVal, childVal)
  }

  return mergeDataOrFn(parentVal, childVal, vm)
}

/**
 * Hooks and props are merged as arrays.
 */
function mergeHook (
  parentVal: ?Array<Function>,
  childVal: ?Function | ?Array<Function>
): ?Array<Function> {
  return childVal
    ? parentVal
      ? parentVal.concat(childVal)
      : Array.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal
}

LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 */
function mergeAssets (parentVal: ?Object, childVal: ?Object): Object {
  const res = Object.create(parentVal || null)
  return childVal
    ? extend(res, childVal)
    : res
}

ASSET_TYPES.forEach(function (type) {
  strats[type + 's'] = mergeAssets
})

/**
 * Watchers.
 *
 * Watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 */
strats.watch = function (parentVal: ?Object, childVal: ?Object): ?Object {
  // work around Firefox's Object.prototype.watch...
  if (parentVal === nativeWatch) parentVal = undefined
  if (childVal === nativeWatch) childVal = undefined
  /* istanbul ignore if */
  if (!childVal) return Object.create(parentVal || null)
  if (!parentVal) return childVal
  const ret = {}
  extend(ret, parentVal)
  for (const key in childVal) {
    let parent = ret[key]
    const child = childVal[key]
    if (parent && !Array.isArray(parent)) {
      parent = [parent]
    }
    ret[key] = parent
      ? parent.concat(child)
      : Array.isArray(child) ? child : [child]
  }
  return ret
}

/**
 * Other object hashes.
 */
strats.props =
strats.methods =
strats.inject =
strats.computed = function (parentVal: ?Object, childVal: ?Object): ?Object {
  if (!parentVal) return childVal
  const ret = Object.create(null)
  extend(ret, parentVal)
  if (childVal) extend(ret, childVal)
  return ret
}
strats.provide = mergeDataOrFn

/**
 * Default strategy.
 */
// 合并options内部属性的默认策略
// 该策略是如果child对应的key没有这个值,那么就用Vue.options
// 如果有值,就用child的值
const defaultStrat = function (parentVal: any, childVal: any): any {
  return childVal === undefined
    ? parentVal
    : childVal
}

/**
 * Validate component names
 */
// 检查components属性,这里主要是防止里面有内建标签名字和保留名字
// 例如is,<component>
function checkComponents (options: Object) {
  for (const key in options.components) {
    const lower = key.toLowerCase()
    if (isBuiltInTag(lower) || config.isReservedTag(lower)) {
      warn(
        'Do not use built-in or reserved HTML elements as component ' +
        'id: ' + key
      )
    }
  }
}

/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 */
// props:['abc'] => props:{abc:}
function normalizeProps (options: Object) {
  const props = options.props
  if (!props) return
  const res = {}
  let i, val, name
  if (Array.isArray(props)) {
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        name = camelize(val)
        res[name] = { type: null }
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.')
      }
    }
  } else if (isPlainObject(props)) {
    for (const key in props) {
      val = props[key]
      name = camelize(key)
      res[name] = isPlainObject(val)
        ? val
        : { type: val }
    }
  }
  options.props = res
}

/**
 * Normalize all injections into Object-based format
 */
// 标准化options里面的inject,主要是考虑到inject如果是数组的话
// 最后需要渲染成对象的形式
// 例如inject:['abc'] => inject:{abc:abc}
function normalizeInject (options: Object) {
  const inject = options.inject
  if (Array.isArray(inject)) {
    const normalized = options.inject = {}
    for (let i = 0; i < inject.length; i++) {
      normalized[inject[i]] = inject[i]
    }
  }
}

/**
 * Normalize raw function directives into object format.
 */
// 标准化指令
// directive("xxx":function()) => directives:{xxx:{bind:function(),update:function()}}
function normalizeDirectives (options: Object) {
  const dirs = options.directives
  if (dirs) {
    for (const key in dirs) {
      const def = dirs[key]
      if (typeof def === 'function') {
        dirs[key] = { bind: def, update: def }
      }
    }
  }
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 */
// 合并2个对象
export function mergeOptions (
  parent: Object,
  child: Object,
  vm?: Component
): Object {
  // 检查child的属性
  if (process.env.NODE_ENV !== 'production') {
    checkComponents(child)
  }
 // 如果child是一个函数,就取函数的options
  if (typeof child === 'function') {
    child = child.options
  }
 // 标准化
  normalizeProps(child)
  normalizeInject(child)
  normalizeDirectives(child)
  // 如果options里面有extends,相当于Vue.extend()的对象模式
  // extends这里传入的某个组件的options对象,可以简单理解为继承
  const extendsFrom = child.extends
  // 如果确实有extends
  if (extendsFrom) {
    // 这里就把parent跟extends合并
    parent = mergeOptions(parent, extendsFrom, vm)
  }
  // extends合并完之后,再找有没有mixins属性
  // 如果有有mixin属性
  if (child.mixins) {
    for (let i = 0, l = child.mixins.length; i < l; i++) {
      parent = mergeOptions(parent, child.mixins[i], vm)
      // 循环去合并mixin数组的每个元素
      // 实际上每个元素就是一个mixin对象
    }
  }
  // 下面定义一个options对象,实际上真正的合并现在才开始,前面都在玩检查和递归
  const options = {}
  let key
  // 遍历Vue.options中的属性,如果对应的属性child里面有,覆盖成child的
  for (key in parent) {
    mergeField(key)
  }
  // 遍历Vue.mixin(child)中的child的属性,这一次找到child中新增的,Vue.options中没有的放入到options中
  for (key in child) {
    if (!hasOwn(parent, key)) {
      mergeField(key)
    }
  }
  // 合并字段
  function mergeField (key) {
    // strats是一个外面的属性,这个属性起始是个纯粹的空对象,{}
    // 因此最开始合并的时候,显然没有属性,于是就defaultStrat
    const strat = strats[key] || defaultStrat
    // 这里精确合并每个属性,例如当前开辟的options = {};
    // 假如说key是"component"
    // 那么就取mixin对象中的component属性,然后再取partent中的component属性
    // 优先mixin的,如果mixin中有,返回的options中用mixin的,否则就用parent的
    options[key] = strat(parent[key], child[key], vm, key)
  }
  // 最终经历各种该递归的递归,该合并extends的合并,最后返回合并后的选项
  return options
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 */
// 处理一个静态资源,这个函数用来子组件需要访问到定义在祖先里面的静态文件
export function resolveAsset (
  options: Object,
  type: string,
  id: string,
  warnMissing?: boolean
): any {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return
  }
  const assets = options[type]
  // check local registration variations first
  if (hasOwn(assets, id)) return assets[id]
  const camelizedId = camelize(id)
  if (hasOwn(assets, camelizedId)) return assets[camelizedId]
  const PascalCaseId = capitalize(camelizedId)
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]
  // fallback to prototype chain
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  return res
}
