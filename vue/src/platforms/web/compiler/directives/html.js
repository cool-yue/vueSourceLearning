/* @flow */

import { addProp } from 'compiler/helpers'
// 基于v-html的操作,基于web平台
export default function html (el: ASTElement, dir: ASTDirective) {
  if (dir.value) {
    addProp(el, 'innerHTML', `_s(${dir.value})`)
  }
}
