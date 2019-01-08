/* @flow */

import { addProp } from 'compiler/helpers'
// 处理v-text的操作,基于web平台
export default function text (el: ASTElement, dir: ASTDirective) {
  if (dir.value) {
    addProp(el, 'textContent', `_s(${dir.value})`)
  }
}
