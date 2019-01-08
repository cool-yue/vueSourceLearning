var template = "<input type='range' v-model='aaa' />";
var template1 = "<input type='text' v-model='aaa' />";
var template2 = "<input type='checkbox' v-model='aaa' />";
console.log(Vue.compile(template).render.toString());
console.log(Vue.compile(template1).render.toString());
console.log(Vue.compile(template2).render.toString());