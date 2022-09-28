import { createElement, render } from "./react";
import { useState } from "./react/render";
/** Step Zero */
// const element = {
// 	type: "h1",
// 	props: {
// 		title: "foo",
// 		children: "Hello",
// 	},
// };

// const container = document.getElementById("root");

// const node = document.createElement(element.type);
// node["title"] = element.props.title;

// const text = document.createTextNode("");
// text["nodeValue"] = element.props.children;

// node.appendChild(text);
// container.appendChild(node);

/** 普通dom渲染 */
// const element = createElement(
// 	"h1",
// 	{ id: "title" },
// 	"hello world",
// 	createElement("a", { href: "https://xxx.com" }, "yyy")
// );

// const container = document.getElementById("root");
// render(element, container);

/** diffing示例 update*/
// const handleInput = (e) => {
// 	renderer(e.target.value);
// };
// const renderer = (value) => {
// 	const container = document.querySelector("#root");
// 	const element = createElement(
// 		"div",
// 		null,
// 		createElement("input", { oninput: (e) => handleInput(e) }, null),
// 		createElement("h1", null, value)
// 	);
// 	render(element, container);
// };

// renderer("hello");

/** diff示例 delete */
// const container = document.querySelector("#root");
// const handleDel = () => {
// 	renderer("new");
// };
// const renderer = (type) => {
// 	const initElement = createElement(
// 		"div",
// 		null,
// 		createElement("button", { onclick: () => handleDel() }, "delete h1"),
// 		createElement("h1", null, "hello h1"),
// 		createElement("h2", null, "hello h2")
// 	);
// 	const newElement = createElement(
// 		"div",
// 		null,
// 		createElement("button", { onclick: () => handleDel() }, "delete h1"),
// 		createElement("h2", null, "hello h2")
// 	);
// 	render(type === "new" ? newElement : initElement, container);
// };

// renderer("init");

/** 函数组件 */
// const App = (props) => {
// 	return createElement("h1", null, "Hi", props.name);
// };
// const container = document.querySelector("#root");
// const element = createElement(App, { name: "luckydog" });
// render(element, container);

/** useState */
const Counter = () => {
	const [num, setNum] = useState(1);
	return createElement(
		"h1",
		{
			onclick: () => {
				setNum((prev) => prev + 1),
					setNum((prev) => prev + 1),
					setNum((prev) => prev + 1);
			},
		},
		num
	);
};
const container = document.querySelector("#root");
const element = createElement(Counter);
render(element, container);
