

const componentA = {
    template: "<transition><div>compoA, {{aaa}}</div></transition>",
    props: ['aaa'],
    mounted() {
        console.log("compA", this.$options._renderChildren);
    },
    beforeUpdate() {
        console.log("componentA beforeUpdate");
    }
};

const componentB = {
    template: "<div>abcdefg</div>"
};

Vue.component("compo-b", componentB);


const app = new Vue({
    el:"#app",
    template:"<div>{{aaa}}<component-a :aaa='aaa' id='aaa' custom='bbb'/><span>{{arr.a}}</span><span>{{arr.b}}</span></div>",
    components: {
        componentA
    },
    data() {
        return {
            aaa: "hahaha",
            arr: {
                a: 1,
                b: 2
            }
        };
    },
    mounted() {
        console.log("root", this.$options._renderChildren);
    },
    beforeUpdate() {
        console.log("root beforeUpdate");
    }
});

app.$mount(document.getElementById("app"));

console.log("Vue.options.components", Vue.options.components);