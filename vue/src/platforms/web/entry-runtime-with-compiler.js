/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { shouldDecodeNewlines } from './util/compat'

// 这里引入了complier模块
// complier引入了options模块
// options模块引入了module/index
// module/index里面引入了events,attrs,class,dom-props,style,transition几个平台相关
// 作为解析的选项
import { compileToFunctions } from './compiler/index'

// 通过querySelector找到id相关的元素,返回innerHTML
const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})
// 设置一个变量指向在prototype上面绑定$mount
const mount = Vue.prototype.$mount
// 比较经典的$mount函数
// 返回一个组件对象
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // 先找到el元素
  el = el && query(el)
  // 如果el元素是body或者document,又开开发模式那么就要给警告了然后拒绝挂载
  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }
// 先拿vue实例的options
  const options = this.$options
  // resolve template/el and convert to render function
  if (!options.render) {
    // 没有render函数
    // 那么久拿到template属性
    let template = options.template
    if (template) {
      // 有template属性
      // template属性为字符串
      if (typeof template === 'string') {
        // 第一个字符为#,
        if (template.charAt(0) === '#') {
          // 那么就认为这是个id选择器,去拿到id选择器内部的innerHTML
          // 在开发模式中,如果没找到innerHTML,给警告
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        // template直接是Element,这是怎么来的,就是ElementUI里面有过这样的用法
        // template:直接挂载一个dom
        // document.createElement('div');这个元素已经创建,虽然不在html页面的dom树里面,但是在内存中啊
        // 初始化好后,依然是个正常的组件,手动去插入到结构树中
        // 那么template就是这个dom的innerHTML
        template = template.innerHTML
      } else {
        // 除此之外,在开发模式里面,给个模板不合法的警告
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      // 如果没有template属性,就拿el的outerHTML当模板
      template = getOuterHTML(el)
    }
    // 如果有模板,这里在开发模式里面给一个性能测试
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }
    // 这里把template转化成render函数
      const { render, staticRenderFns } = compileToFunctions(template, {
        shouldDecodeNewlines,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
    // 转化后的render给options.reder
      options.render = render
    // 静态rendersFns给options.staticRenderFns
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  // 返回一个调用mount(el,hydrating)
  // 这里可以认为是递归么
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
// 拿到el的outerHTML,比如<div><a>123</a></div>,div.outerHTML就是包含自身<div><a>123</a></div>
// innerHTML为<a>123</a>
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

// compileToFunctions感觉上是把模板转化成一个render函数
Vue.compile = compileToFunctions

export default Vue
