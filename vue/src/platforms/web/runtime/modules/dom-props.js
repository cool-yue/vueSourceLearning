/* @flow */

import { isDef, isUndef, extend, toNumber } from 'shared/util'

// domProps怎么来描述呢
// 比如innerHTML,是将dom作为对象的原生属性 比如value这种属性
// 个人认为之所以存在专门处理domProps
// 是因为用户自定义写render的时候会用到
// 就像最初的props在模板解析阶段都是放进attrs的

// 首先要写一下为什么需要domProps,原因很简单
// 比如一个dom对象,我要在上面存一个属性,比如div
// div.aaa = "123"
// 这个时候我怎么办呢?
// 通过纯粹的标签是不能够反映这种情况的,比如<div aaa="123"></div>
// 要么通过js来设置,实际上这个aaa设置的attribute
// 我们要的结果是div.aaa = "123",把dom当以个纯粹的对象用
// 要做到这样的操作,可以使用domProps这个属性
// 它底层实现的方式就是通过 div.domProp = xxx来进行
// 区别于attr的setAttribute()


// 如果用户手动去写,显然要写成domProps会比较好
function updateDOMProps (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  // 如果没有定义就不处理
  // 说下domProps的特殊性
  // domProps.innerHTML = xxxx
  // 区别于attr,它是通过setAttribute体现不出来的
  // 同时value有意思的是它既可以是attr也可以是props
  // 例如el.setAttribute("value","");
  // el.value = xxx;
  if (isUndef(oldVnode.data.domProps) && isUndef(vnode.data.domProps)) {
    return
  }
  let key, cur
  const elm: any = vnode.elm
  const oldProps = oldVnode.data.domProps || {}
  let props = vnode.data.domProps || {}
  // clone observed objects, as the user probably wants to mutate it
  if (isDef(props.__ob__)) {
    props = vnode.data.domProps = extend({}, props)
  }

  for (key in oldProps) {
    // 类似于其它几个属性的更新操作
    // 只是domProps可以通过el.xxx = xxx来进行赋值更新
    if (isUndef(props[key])) {
      elm[key] = ''
    }
  }
  for (key in props) {
    // 循环遍历props
    // 如果key === textContent 或者 innerHTML
    // 那么就把vnode的children清0
    // 如果当前的值跟老节点的值一样就继续下一次循环
    cur = props[key]
    // ignore children if the node has textContent or innerHTML,
    // as these will throw away existing DOM nodes and cause removal errors
    // on subsequent patches (#3360)
    if (key === 'textContent' || key === 'innerHTML') {
      if (vnode.children) vnode.children.length = 0
      if (cur === oldProps[key]) continue
    }
    // 如果是value的情况
    if (key === 'value') {
      // store value as _value as well since
      // non-string values will be stringified
      // 把cur值赋值到elm._value上面
      elm._value = cur
      // avoid resetting cursor position when value is the same
      // 没定义的变成'',定义了的字符串话
      // 例如input.value = undefined,有些时候容易误解,转化为input.value = '';
      const strCur = isUndef(cur) ? '' : String(cur)
      if (shouldUpdateValue(elm, vnode, strCur)) {
        elm.value = strCur
      }
    } else {
      // 其余的情况直接赋值
      elm[key] = cur
    }
  }
}

// check platforms/web/util/attrs.js acceptValue
// 接受value的几个元素
// input,Select,Option
type acceptValueElm = HTMLInputElement | HTMLSelectElement | HTMLOptionElement;

// 什么时候需要更新
// 对于上面的元素
// 如果没有composing或者dirty了或者change了
// 都会触发更新
function shouldUpdateValue (
  elm: acceptValueElm,
  vnode: VNodeWithData,
  checkVal: string
): boolean {
  return (!elm.composing && (
    vnode.tag === 'option' ||
    isDirty(elm, checkVal) ||
    isInputChanged(elm, checkVal)
  ))
}

function isDirty (elm: acceptValueElm, checkVal: string): boolean {
  // return true when textbox (.number and .trim) loses focus and its value is
  // not equal to the updated value
  let notInFocus = true
  // #6157
  // work around IE bug when accessing document.activeElement in an iframe
  try { notInFocus = document.activeElement !== elm } catch (e) {}
  return notInFocus && elm.value !== checkVal

  // 这里做的工作是,比如在input中输入值
  // 输入的过程中,实际上还没有blur掉,也就是焦点还在input上面
  // 这个时候并不会去更新,而是在notInFocuse并且value !== checkVal的时候
  // 才认为激活了脏数据,需要更新了
}

function isInputChanged (elm: any, newVal: string): boolean {
  // 这里判断值是否有改动
  // 如果有改动就返回ture没改动返回false
  // 至于是不是加入了modifier,这里不讨论
  // 也就是v-model的用法,比如限定数字,限定trim之类的
  const value = elm.value
  const modifiers = elm._vModifiers // injected by v-model runtime
  if (isDef(modifiers) && modifiers.number) {
    return toNumber(value) !== toNumber(newVal)
  }
  if (isDef(modifiers) && modifiers.trim) {
    return value.trim() !== newVal.trim()
  }
  return value !== newVal
}

export default {
  create: updateDOMProps,
  update: updateDOMProps
}
