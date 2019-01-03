/* @flow */

import config from 'core/config'

import {
  warn,
  isObject,
  toObject,
  isReservedAttribute
} from 'core/util/index'

/**
 * Runtime helper for merging v-bind="object" into a VNode's data.
 */
// 绑定v-bind是object的时候
// const isReservedAttribute = makeMap('key,ref,slot,is')
// 接受4个参数
// data为vnodedata对象
// tag为是在哪个元素上,字符串
// value为v-bind="xxx",这里value为xxx这个值
// asProps为false

/**
 * var mustUseProp = function (tag, type, attr) {
  return (
    (attr === 'value' && acceptValue(tag)) && type !== 'button' ||
    (attr === 'selected' && tag === 'option') ||
    (attr === 'checked' && tag === 'input') ||
    (attr === 'muted' && tag === 'video')
  )
};
 *
 *
 *
 *
 *
 */



export function bindObjectProps (
  data: any,
  tag: string,
  value: any,
  asProp: boolean,
  isSync?: boolean
): VNodeData {
  // 先看有没有value值
  // 有值,必须是对象或者数组，如果是数组将数组转化为数组对象（key为数字）
  // 基本上这个函数就是针对value来并入属性的
  // 拿到value这个对象后,开始遍历这个对象
  // 如果这个 value对象存在这些键值{class:"",style:"",key:"",ref:"",slot:""}
  // 就把data里面不存在这个key,就把value的key对应的值，赋给data,也就是说把上面这几个属性的值
  // 抽取出来并入到data里面
  // 如果不是上面的这些属性,那就就先拿到attrs里面的type属性,这里为undefined
  // asProps为false，因此要看config.mustUseProps(tag,type,key)
  // 如果这个函数返回了true
  // 那么就取到domProps，然后把value里面存在的key而domProps不存在的赋值到domProps对象中
  // 如果这个函数返回了false
  // 那么就并入到data.attrs中
  if (value) {
    if (!isObject(value)) {
      process.env.NODE_ENV !== 'production' && warn(
        'v-bind without argument expects an Object or Array value',
        this
      )
    } else {
      if (Array.isArray(value)) {
        value = toObject(value)
      }
      let hash
      for (const key in value) {
        if (
          key === 'class' ||
          key === 'style' ||
          isReservedAttribute(key)
        ) {
          hash = data
        } else {
          const type = data.attrs && data.attrs.type
          hash = asProp || config.mustUseProp(tag, type, key)
            ? data.domProps || (data.domProps = {})
            : data.attrs || (data.attrs = {})
        }
        if (!(key in hash)) {
          hash[key] = value[key]

          if (isSync) {
            const on = data.on || (data.on = {})
            on[`update:${key}`] = function ($event) {
              value[key] = $event
            }
          }
        }
      }
    }
  }
  return data
}
