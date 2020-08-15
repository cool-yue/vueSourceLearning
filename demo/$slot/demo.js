var template1 = "<div><slot><div>aaaa</div></slot></div>"
var template2 = "<aaa><div>aaa</div></aaa>"

 var render1 = Vue.compile("<aaa><div slot='header'>aaa</div></aaa>");
 var render2 = Vue.compile("<div><slot name='header'></slot><slot name='footer'></slot><slot></slot></div>");
var render3 = Vue.compile(template1);


 console.log("render1",render1.render);
 console.log("render2",render2.render);
 console.log("render3",render3.render);


tempalte3 = `<ul><dx-li><span slot-scope="scope">{{scope.str}}</span></dx-li></ul>`

template4 = `<li class="dx-li">	<slot str="你好 掘金！">hello juejin!</slot></li>`
var render4 = Vue.compile(tempalte3);
var render5 = Vue.compile(template4);

//var render4 = Vue.compile(tempalte3);
console.log("render4",render4.render);
console.log("render5",render5.render);




Vue.component("myDiv",{
	template:"<div><slot>我是默认的</slot></div>",
	mounted() {
		console.log("myDiv this.$slots",this.$slots);
		console.log("myDiv",this.$options);
	}
});




Vue.component("myLi",{
	template:"<div><slot></slot><slot name='header'></slot><my-div><div>I come from MyLi</div></my-div></div>",
	mounted() {
		console.log(this.$slots);
		console.log("this.$slots.default[0].context === this.$parent",this.$slots.default[0].context === this.$parent);
		console.log(this.$slots.default[0].context);
		console.log(this.$parent);
		console.log("myLi",this.$options);
	}
});


const app = new Vue({
    el:"#app",
    template:"<transition name='fade'><my-li><h1 slot='header'></h1><div>I am the default</div></my-li></transition>"
});

app.$mount(document.getElementById("app"));



// let string1 = "<li>abc</li>";

let string1 = "<img src='aaa/aaa' />";

console.log(string1,  Vue.compile(string1).render.call(app));




