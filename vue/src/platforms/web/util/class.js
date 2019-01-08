/* @flow */

import { isDef, isObject } from 'shared/util'

export function genClassForVnode (vnode: VNode): string {
  let data = vnode.data
  let parentNode = vnode
  let childNode = vnode
  while (isDef(childNode.componentInstance)) {
    // 判断vnode是否有componentInstance
    // 如果有,证明这是一个自定义组件例如<abc class="xxxx"></abc>
    // 显然abc是没有意义的标签,有意义的标签应该是abc里面的render渲染成的html
    // componentInstance._vnode描述的内层的vnode的结构
    // 于是访问vnode的data属性
    // 然后在上面的data属性中并入classData
    childNode = childNode.componentInstance._vnode
    if (childNode.data) {
      data = mergeClassData(childNode.data, data)
    }
  }
  // 判断vnode有没有parent,parent也是一个Vnode
  // 只要parent有,且有data
  // 就不停地去把parent.data并入到当前vnode的data的class
  // 为什么要这么做呢,因为css的继承性
  // 有些祖先元素可能影响到了后代
  while (isDef(parentNode = parentNode.parent)) {
    if (parentNode.data) {
      data = mergeClassData(data, parentNode.data)
    }
  }
  // 最后render最后合并好的data.staticClass和data.class
  return renderClass(data.staticClass, data.class)
}

// mergeClassData
// 返回一个对象{statciClass:xxx,class:xxx}
// staticClass通过contact合并
// class通过数组来装入,如果child没有class,就取父vnode的class
// 总而言之就是以数组的形式汇聚class
function mergeClassData (child: VNodeData, parent: VNodeData): {
  staticClass: string,
  class: any
} {
  return {
    staticClass: concat(child.staticClass, parent.staticClass),
    class: isDef(child.class)
      ? [child.class, parent.class]
      : parent.class
  }
}

//
export function renderClass (
  staticClass: ?string,
  dynamicClass: any
): string {
  if (isDef(staticClass) || isDef(dynamicClass)) {
    // 最终将解析出来的静态class和动态class再来一次字符串的拼接
    return concat(staticClass, stringifyClass(dynamicClass))
  }
  /* istanbul ignore next */
  return ''
}

// 看a有没有,如果a没有就返回b,如果b也没有就返回''
// 如果a有,再看b有没有,如果b有就是a + " " + b,
// 如果a有,b没有,就返回a
// 怎么说呢,就是以空格为分隔的形式去拼接这些class
export function concat (a: ?string, b: ?string): string {
  return a ? b ? (a + ' ' + b) : a : (b || '')
}

// dynamicClass是用户定义的class
// 由于static只是个字符串,所以没啥影响,就是字符串的拼来拼去
// 而dynamicClass是对象,最终的形式可能是[{},{}],[[],[],{}],[[{}],[],{}]
// 各种数组和对象的交织
// 这些对象显然不能用啊,必须要转化成字符串
export function stringifyClass (value: any): string {
  // 数组情况
  if (Array.isArray(value)) {
    return stringifyArray(value)
  }
  // 对象情况
  if (isObject(value)) {
    return stringifyObject(value)
  }
  // string直接返回
  if (typeof value === 'string') {
    return value
  }
  /* istanbul ignore next */
  // 啥都没有,返回''
  return ''
}

// 字符串化Array
// array里面因为也有可能存在对象和数组例如[{},{},[]]
// 所以遍历每一个数组的对象的时候,继续调用stringifyClass解析单个元素
// 这里基本上就是递归了
// 最后拼接成一个大class的string
// 实际上array最终调用的只是Object,因为数组的每个元素不可预测
// 如果是对象,那么就取键值作为class就行了
function stringifyArray (value: Array<any>): string {
  let res = ''
  let stringified
  for (let i = 0, l = value.length; i < l; i++) {
    if (isDef(stringified = stringifyClass(value[i])) && stringified !== '') {
      if (res) res += ' '
      res += stringified
    }
  }
  return res
}

// 字符串化对象
// 将一个对象抽取出来,只需要看值是不是true,就可以判定要不要该class
// 将键拼接起来
function stringifyObject (value: Object): string {
  let res = ''
  for (const key in value) {
    if (value[key]) {
      if (res) res += ' '
      res += key
    }
  }
  return res
}
