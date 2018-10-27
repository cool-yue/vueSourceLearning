/* @flow */

// 输出一个被冰的空对象,该对象不能够被操作,纯粹的空
export const emptyObject = Object.freeze({})

/**
 * Check if a string starts with $ or _
 */
// 保留字,由于vue实例大量使用了_好$作为实例的属性
// 因此把这两个开头的属性作为保留
export function isReserved (str: string): boolean {
  const c = (str + '').charCodeAt(0)
  return c === 0x24 || c === 0x5F
}

/**
 * Define a property.
 */
// 单纯在一个对象上定义一个属性
// 注意第四个参数不传,那么它的默认值是undefined,undefined对应的bool值为false
// 也就是说不传第四个参数就是在一个对象上面申明不可枚举的属性
export function def (obj: Object, key: string, val: any, enumerable?: boolean) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  })
}

/**
 * Parse simple path.
 */
// 匹配非单词开头,但是可以以任意字符结尾
// 这个函数就是获取到多层次属性值
// 例如我要监听obj:{a:{b:{}}}上面的b属性,那么只需要vm.$watch('a.b');
// 虽然传入的是字符串,但是实际上$watch底层将这个字符串看做是表达式,并且一层一层去拨开
// 按照下面的逻辑就是,先去拿a,即去到obj.a,然后拿了b,再去拿obj.a.b,最后返回对象obj的b属性的值
const bailRE = /[^\w.$]/
export function parsePath (path: string): any {
  if (bailRE.test(path)) {
    return
  }
  const segments = path.split('.')
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]]
    }
    return obj
  }
}
