/* @flow */

import { warn } from './debug'
import { observe, observerState } from '../observer/index'
import {
  hasOwn,
  isObject,
  hyphenate,
  capitalize,
  isPlainObject
} from 'shared/util'

type PropOptions = {
  type: Function | Array<Function> | null,
  default: any,
  required: ?boolean,
  validator: ?Function
};

export function validateProp (
  key: string,
  propOptions: Object,
  propsData: Object,
  vm?: Component
): any {
  // propOptions中拿到对应key的值
  // propsData是不是没有key这个值
  // 拿到propsData中该key对应的值
  const prop = propOptions[key]
  const absent = !hasOwn(propsData, key)
  let value = propsData[key]
  // handle boolean props

  // 这里注意propsData为用户传入的值放在vnode里面
  // options为用户定义的类型而已
  // 如果prop.type是布尔值
  // 以下是处理bool类型的值
  if (isType(Boolean, prop.type)) {
    // 如果propsData里面没有,并且prop里面也没有default属性
    if (absent && !hasOwn(prop, 'default')) {
      // 就把value赋值为false
      // 如果压根没给这个属性例如组件<abc>有个aaa的props
      // <abc></abc>
      // 那么aaa的值为false
      value = false
    } else if (!isType(String, prop.type) && (value === '' || value === hyphenate(key))) {
      // 如果prop.types部位string并且value为''或者value没有带横杠
      // 这种情况基本上是<div abc></div>是这种情况
      // 渲染的时候propsData:{"abc":""}
      // 默认情况会给true
      value = true
    }
  }
  // check default value
  // 如果value传入的是undefined
  if (value === undefined) {
    // 在vm上拿到prop的默认值
    value = getPropDefaultValue(vm, prop, key)
    // since the default value is a fresh copy,
    // make sure to observe it.
    const prevShouldConvert = observerState.shouldConvert
    observerState.shouldConvert = true
    // 那么就观察这个value
    observe(value)
    observerState.shouldConvert = prevShouldConvert
  }
  if (process.env.NODE_ENV !== 'production') {
    // 在开发模式的情况下，顺便来个断言
    assertProp(prop, key, value, vm, absent)
  }
  // 如果不为undefined就直接返回这个值
  return value
}

/**
 * Get the default value of a prop.
 */
// 拿到一个props的默认值
function getPropDefaultValue (vm: ?Component, prop: PropOptions, key: string): any {
  // no default, return undefined
  // 没有default属性就返回undefined
  if (!hasOwn(prop, 'default')) {
    return undefined
  }
  // 拿到default属性
  const def = prop.default
  // warn against non-factory defaults for Object & Array
  if (process.env.NODE_ENV !== 'production' && isObject(def)) {
    warn(
      'Invalid default value for prop "' + key + '": ' +
      'Props with type Object/Array must use a factory function ' +
      'to return the default value.',
      vm
    )
  }
  // the raw prop value was also undefined from previous render,
  // return previous default value to avoid unnecessary watcher trigger
  if (vm && vm.$options.propsData &&
    vm.$options.propsData[key] === undefined &&
    vm._props[key] !== undefined
    // 如果propsData原生prop没有值,而_props有值，那么就返回_props的
  ) {
    return vm._props[key]
  }
  // call factory function for non-Function types
  // a value is Function if its prototype is function even across different execution context
  // def如果是function并且type不是function的情况就调用def
  // 否则就直接拿到def
  return typeof def === 'function' && getType(prop.type) !== 'Function'
    ? def.call(vm)
    : def
}

/**
 * Assert whether a prop is valid.
 */
// 运行validator
function assertProp (
  prop: PropOptions,
  name: string,
  value: any,
  vm: ?Component,
  absent: boolean
) {
  if (prop.required && absent) {
    warn(
      'Missing required prop: "' + name + '"',
      vm
    )
    return
    // 如果option中设置了reuqire但是propData却没有,表示没有传
    // 那么就报警告
  }
  // 如果value为null,并且required为false
  // 那么返回
  if (value == null && !prop.required) {
    return
  }
  // 拿到type的值
  let type = prop.type
  // 如果没有type,那么valid为true
  // 如果type有值,那么显然valid为false，type不能够传true
  let valid = !type || type === true
  const expectedTypes = []
  if (type) {
    // 如果type有值,并且不是array
    // 那么就把type转化成array
    if (!Array.isArray(type)) {
      type = [type]
    }
    // 如果type存在,那么valid必然为false
    // 然后执行type的循环验证
    // 每次将拿到比较的结果
    // 一旦valid为true
    // 循环停止
    // 运行到这里只能保证类型正确
    for (let i = 0; i < type.length && !valid; i++) {
      const assertedType = assertType(value, type[i])
      expectedTypes.push(assertedType.expectedType || '')
      valid = assertedType.valid
    }
  }
  // 类型不正确报错
  if (!valid) {
    warn(
      'Invalid prop: type check failed for prop "' + name + '".' +
      ' Expected ' + expectedTypes.map(capitalize).join(', ') +
      ', got ' + Object.prototype.toString.call(value).slice(8, -1) + '.',
      vm
    )
    return
  }
  // 类型正确,并且这里还有validator
  // 那么就运行validator(value)
  // value为传入的值,如果没通过报警告
  const validator = prop.validator
  if (validator) {
    if (!validator(value)) {
      warn(
        'Invalid prop: custom validator check failed for prop "' + name + '".',
        vm
      )
    }
  }
}

const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/

// 作为props的type的验证,如果传入错误的类型,会发出警告
// 返回值为一个对象,该对象有2个值,一个是valid它是bool类型
// 是一个期待的类型,它是一个字符串
function assertType (value: any, type: Function): {
  valid: boolean;
  expectedType: string;
} {
  let valid
  // 拿到Function的名字,例如function String就是拿到string
  const expectedType = getType(type)
  if (simpleCheckRE.test(expectedType)) {
    // 然后通过typeof value来判断是否是指定类型
    valid = typeof value === expectedType.toLowerCase()
  } else if (expectedType === 'Object') {
    // 如果是Object,那么就看value是不是Object
    valid = isPlainObject(value)
  } else if (expectedType === 'Array') {
    // 如果是Array就看是不是Array
    valid = Array.isArray(value)
  } else {
    // 如果是用户自定义的类型,直接用typeof来进行检查
    valid = value instanceof type
  }
  return {
    valid,
    expectedType
  }
}

/**
 * Use function string name to check built-in types,
 * because a simple equality check will fail when running
 * across different vms / iframes.
 */

 // getType的作用是把传入的函数进行toString
 // 然后如果匹配,拿到function (拿着到这里这里的值)
 // 比如 function Array,那么拿到的就是"Array"
 // 如果不匹配返回的就是 ""
function getType (fn) {
  const match = fn && fn.toString().match(/^\s*function (\w+)/)
  return match ? match[1] : ''
}

// 判断第一个参数的type和第二个参数的type是一样的
// 排除了fn是数组的情况
// 如果fn是数组,那么就遍历这个数组如果找到有匹配的直接返回true,遍历没找到匹配的返回false
function isType (type, fn) {
  if (!Array.isArray(fn)) {
    return getType(fn) === getType(type)
  }
  for (let i = 0, len = fn.length; i < len; i++) {
    if (getType(fn[i]) === getType(type)) {
      return true
    }
  }
  /* istanbul ignore next */
  return false
}
