/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

// 向外面导出了一个数组方法对象,这个对象被认为的插入了观察者来监听这个变化

/**
 * Intercept mutating methods and emit events
 */
// 拦截改变数组值得方法然后出发事件,数组就该的值有以下几个
;[
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]
.forEach(function (method) {
  // cache original method
  // 使用一个对象放进original里面,存有以上的数组的方法
  const original = arrayProto[method]
  // 在arrayMethod上面定义这些同名方法,其中arrayMethod的proto指向了Array.prototype
  def(arrayMethods, method, function mutator (...args) {
    // ...arg = 1,2,3 ,arg = [1,2,3]
    // 参数用了一个展开表达式,也就是说参数需要传入数组
    // 将参数作为数组传入数组中的某个方法,调用并拿到结果
    const result = original.apply(this, args)
    // 拿到this.__ob__
    const ob = this.__ob__
    let inserted
    // 如果是push和unshift方法,拿到args值,这个值是个数组,里面放着被压入的元素数组
    // 例如arr.push(1,2),这里args = [1,2]
    // 如果是splice方法,那么就到第三个参数往后的参数,也是插入的值
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    // 如果inserted有值,那么用ob去观察被插入的这个数组
    if (inserted) ob.observeArray(inserted)
    //ob.dep.notify()通知变化
    //返回result,这个结果就是跟正常的数组函数返回一样的结果
    // notify change
    ob.dep.notify()
    return result
  })
})
