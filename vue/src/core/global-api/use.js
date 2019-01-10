/* @flow */

import { toArray } from '../util/index'

// use是绑定在Vue上，相当于是一个静态方法，也可以认为是全局方法。
// use的作用就是安装插件

// 分析一下相关的逻辑
// use接收一个参数，这个参数可以是Function也可以是Object
// 初始化一个_installedPlugins的数组,如果有就直接用
// 如果传入的插件在这数组中存在,该函数直接返回
// toArray函数是将类数组转化成数组,并且可以指定从哪里开始,比如传1的话
// 就是索引从1开始复制，这里主要是拿到除了第一个插件参数之后的其他参数
// 并且把参数列表数组的第一位插入Vue构造函数
// 如果plugin是个对象,它里面的install属性是个函数,那么就运行函数,并且把args丢给它作为参数
// 如果plugin本身就是个函数,就直接调用它,然后扔给他一个数组作为参数

// 这里转化成数组纯粹是为了给apply来使用
// 最后把该plugin丢进缓存中,installedPlugins

// 这里的思想就是,对外暴露一个Vue,但是又不能随便去暴露,需要在一个use的作用域中来进行
// 插件无法就是要绑定在Vue对象身上的一些自定义的东西

// use的第一种用法就是,Vue.use(fn),这个fn是个函数直接运行,Vue的内部逻辑把Vue构造器当成第一个参数
// use的第二种用法就是,Vue,use({install:fn}),同理Vue的内部逻辑是如果是对象就要实现一个install属性的方法,第一个参数还是Vue
// 最后就是Vue._installedPlugins ,内部维护这一个对象,绑定到了全局,每次安装插件的时候,先判断这个函数的在不在这个数组里面,
// 也就是同一函数是不会注册两次的,但是不同地址的2个相同的函数是可以注册2次的,因为比较只用了简单的[].indexOf来比较

export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    const args = toArray(arguments, 1)
    // 这就是install函数的第一个参数是Vue
    args.unshift(this)
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args)
    }
    installedPlugins.push(plugin)
    return this
  }
}
