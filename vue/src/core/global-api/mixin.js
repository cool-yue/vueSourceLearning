/* @flow */

import { mergeOptions } from '../util/index'

// 在Vue上加了一个mixin的函数,它的思路就是如果Vue.mixin是加载全局的options上了
// 代码逻辑是把mixin对象里面的东西跟Vue的options中的值进行合并

// mergeOptions
// 接受2个对象的参数
// 返回：对象
// 合并的逻辑是:
// 首先检查被合并的对象里面的components属性,该属性需要检查保留字或者内建组件名字,他们是slot和component,保留属性'key,ref,slot,is'
// 如果被合并的是个函数,那么取这个函数的options的属性,这个并不是很清楚为什么要检查是函数的情况一般mixin也不会传入函数把
// 下面面标准化混入对象的props,inject,directives
// props:
// 如果有props,props是数组,如果属性存在XXX-XXX-XX这样的，先换成驼峰
// inject
// 如果是inject是数组,先把inject变成对象,例如inject:['a'] => inject:{a:a}
// directives:主要标准化，指令的简写模式
// 例如directive:{'color-swatch':function(){xxxxx}} => directvie:{bind:function(){xxxx},update:function(){xxxxxx}}
// extends,要想知道extends实现了什么,先要看extends,先放一放
//?????????????????????????
// mixin:同理，相当于做了递归
//
// 定义一个options,这时child的属性已经标准化了,然后最后再做一个大合并
// 大合并的规则是,如果是在Vue原生options里面有的配置,mixin里有雷同的,优先用mixin的
// 如果mixin里有的,原生没有的,也用mixin的，这个规则看起来是这样，但是实际上不是的，明天继续分析
// 实际的结果是,不管是本地混入还是全局混入,他们的属性都会存在，而且是并入一个属性中，这个逻辑怎么体现？
export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    this.options = mergeOptions(this.options, mixin)
    // 这里的options为初始options,就是比如 {directives:{"v-show"}},因为vue之所以默认就有<div v-show></div>
    // 不是平白无故的,在初始化Vue的时候,就构建了一套内建的指令或者组件等一些
    return this
  }
}

// 由于Vue.mixin属于全局函数,而通常我们实例化一个Vue对象的时候,都会new Vue({options})来
// 在调用new Vue之前,我们并没有传入options
// 但是呢Vue本身就有默认的options,全局的<keep-alive>组件
// 通过在控制台打印Vue.options
// 比如directives的v-show指令,这些都是在初始化Vue构造函数绑定在Vue全局对象上面的
// 一旦mixin进去后,所有的属性都会被mixin给覆盖,但是呢,覆盖后的属性有一个__proto__指向了对应没mixin的时候Vue对应的全局属性
// 例如Vue.mixin({directives:{'v-aaa'}})=>这是全局注册指令,那么Vue的options就变成了{directives:{"v-aaa"},__proto__:a}
// 这个a就是{directives:{"v-show"}},现在相当于说options中的每个属性现在已经继承了
// 现在的问题在在mergeOptions中并没有找到相关的去继承的逻辑,这里先放一下