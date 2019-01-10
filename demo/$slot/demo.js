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




