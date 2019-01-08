/* @flow */

import { isIE9 } from 'core/util/env'

import {
  extend,
  isDef,
  isUndef
} from 'shared/util'

import {
  isXlink,
  xlinkNS,
  getXlinkProp,
  isBooleanAttr,
  isEnumeratedAttr,
  isFalsyAttrValue
} from 'web/util/index'

// attrs主要是体现在标签上面的东西
// 这里处理的attr已经是抽取了props之后的attr
// 例如attrs:{id:xxx}


function updateAttrs (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  const opts = vnode.componentOptions
  // 取到vnode的componentOptions
  // 注意这里拿的是componentOptions
  // 只有vue-component的组件,才有这个属性
  // 比如<abc id="bbb"></abc>
  // 如果有这个属性证明是一个vue-component,并且如果不继承属性
  // 那么就不处理
  if (isDef(opts) && opts.Ctor.options.inheritAttrs === false) {
    return
  }
  // 如果oldVnode.data.attrs和vnode都不存在就不需要去处理
  if (isUndef(oldVnode.data.attrs) && isUndef(vnode.data.attrs)) {
    return
  }

  let key, cur, old
  // dom
  const elm = vnode.elm
  // 新老attrs
  const oldAttrs = oldVnode.data.attrs || {}
  let attrs: any = vnode.data.attrs || {}
  // clone observed objects, as the user probably wants to mutate it
  // 如果attrs中有__ob__
  // 那么就需要重新拷贝一个对象
  // 考虑到用户可能会修改它
  if (isDef(attrs.__ob__)) {
    attrs = vnode.data.attrs = extend({}, attrs)
  }

  // 遍历新的attrs
  for (key in attrs) {
    cur = attrs[key]
    old = oldAttrs[key]
    // 如果旧的跟新的不同,就设置新的
    if (old !== cur) {
      setAttr(elm, key, cur)
    }
  }
  // #4391: in IE9, setting type can reset value for input[type=radio]
  /* istanbul ignore if */
  // 在ie9中,如果attrs.value !== oldAttrs.value
  // 设置value
  if (isIE9 && attrs.value !== oldAttrs.value) {
    setAttr(elm, 'value', attrs.value)
  }
  // 这里寻找旧属性有,但是新属性没有的
  // 删除新属性
  for (key in oldAttrs) {
    if (isUndef(attrs[key])) {
      if (isXlink(key)) {
        elm.removeAttributeNS(xlinkNS, getXlinkProp(key))
      } else if (!isEnumeratedAttr(key)) {
        elm.removeAttribute(key)
      }
    }
  }
}

// setAttr
//
function setAttr (el: Element, key: string, value: any) {
  if (isBooleanAttr(key)) {
    // set attribute for blank value
    // e.g. <option disabled>Select one</option>
    // 如果是boolean的attr
    if (isFalsyAttrValue(value)) {
      // 值为falsy
      // 这里要强调一下,<option diabled>Select one</option>
      // 经过compile之后,attrs:{diabled:""}
      // 如果单纯的判断false话,""其实是为false,但是实际上行为是true
      // 因此这里要指明isFalsyAttrValue,该方法只认为null和undefined为false
      // 就移除这个属性
      el.removeAttribute(key)
    } else {
      // 如果不位false
      // 就把对应的值设置上去
      el.setAttribute(key, key)
    }
  } else if (isEnumeratedAttr(key)) {
    // 如果是枚举属性
    // 枚举属性的意思就是它的值是一系列固定的值
    // vue列出了3个,这3个值全都只能接受false或者true
    // 所以这里做一个转化要么false要么true
    // 'contenteditable,draggable,spellcheck'
    // 比如我传入的是undefined但是它能够帮我解析成false
    el.setAttribute(key, isFalsyAttrValue(value) || value === 'false' ? 'false' : 'true')
  } else if (isXlink(key)) {
    //xlink的情况
    if (isFalsyAttrValue(value)) {
      el.removeAttributeNS(xlinkNS, getXlinkProp(key))
    } else {
      el.setAttributeNS(xlinkNS, key, value)
    }
  } else {
    if (isFalsyAttrValue(value)) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, value)
    }
  }
}

export default {
  create: updateAttrs,
  update: updateAttrs
}
