function createDOM(fiber) {
	// 创建元素
	const dom =
		fiber.type === "TEXT_ELEMENT"
			? document.createTextNode("")
			: document.createElement(fiber.type);

	// 赋予属性
	Object.keys(fiber.props)
		.filter((key) => key !== "children")
		.forEach((name) => (dom[name] = fiber.props[name]));

	return dom;
}

function render(element, container) {
	// 初始化下一个工作单元（根节点）
	wipRoot = {
		dom: container,
		props: {
			children: [element],
		},
		sibling: null,
		child: null,
		parent: null,
		// 记录上一次此节点对应的fiber
		alternate: currentRoot,
	};
	deletions = [];
	nextUnitOfWork = wipRoot;
}

// 待处理的任务
let nextUnitOfWork = null;
// 记录整颗Fiber树
let wipRoot = null;
// 记录上一次Fiber树
let currentRoot = null;
// diffing中记录要删除的节点
let deletions = null;

function commitRoot() {
	deletions.forEach(commitWork);
	commitWork(wipRoot.child);
	// 记录上一次Fiber树
	currentRoot = wipRoot;
	wipRoot = null;
}

function commitWork(fiber) {
	if (!fiber) {
		return;
	}
	/**
	 * 函数组件不存在dom
	 * 需要递归向上寻找祖先的dom
	 */
	let parentDOMFiber = fiber.parent;
	while (!parentDOMFiber.dom) {
		parentDOMFiber = parentDOMFiber.parent;
	}
	const parentDOM = parentDOMFiber.dom;
	/**
	 * 新建 删除操作比较容易，直接控制父节点的添加删除即可
	 * 更新操作需要对比前后props
	 */
	if (fiber.effectTag === "PLACEMENT" && fiber.dom) {
		parentDOM.append(fiber.dom);
	} else if (fiber.effectTag === "DELETION" && fiber.dom) {
		commitDeletion(fiber, parentDOM);
		/**
		 * 删除当前节点后return即可
		 * 没必要继续处理其子节点以及兄弟节点
		 */
		return;
	} else if (fiber.effectTag === "UPDATE" && fiber.dom) {
		updateDOM(fiber.dom, fiber.alternate.props, fiber.props);
	}
	commitWork(fiber.child);
	commitWork(fiber.sibling);
}

function commitDeletion(fiber, parentDOM) {
	if (fiber.dom) {
		parentDOM.removeChild(fiber.dom);
	} else {
		/**
		 * 应对函数组件特殊情况
		 */
		commitDeletion(fiber.child, parentDOM);
	}
}

function updateDOM(dom, prevProps, nextProps) {
	// 删除已经没有的props
	Object.keys(prevProps)
		.filter((key) => key !== "children")
		.filter((key) => !(key in nextProps))
		.forEach((name) => (dom[name] = ""));

	// 赋予新的或者改变的props
	Object.keys(nextProps)
		.filter((key) => key !== "children")
		.filter((key) => !(key in prevProps) || prevProps[key] !== nextProps[key])
		.forEach((name) => (dom[name] = nextProps[name]));

	// 删除已经没有的或者发生变化的事件处理函数
	Object.keys(prevProps)
		.filter((key) => key.startsWith("on"))
		.filter((key) => !(key in nextProps) || prevProps[key] !== nextProps[key])
		.forEach((name) => {
			const eventType = name.toLowerCase().substring(2);
			dom.removeEventListener(eventType, prevProps[name]);
		});

	// 添加新的事件处理函数
	Object.keys(nextProps)
		.filter((key) => key.startsWith("on"))
		.filter((key) => prevProps[key] !== nextProps[key])
		.forEach((name) => {
			const eventType = name.toLowerCase().substring(2);
			dom.addEventListener(eventType, prevProps[name]);
		});
}

function workLoop(deadline) {
	// 剩余时间是否足够执行任务的标识
	let shouldYield = false;
	while (nextUnitOfWork && !shouldYield) {
		// 处理当前任务并返回下一个待执行的任务
		nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
		shouldYield = deadline.timeRemaining() < 1;
	}

	// commit阶段 保证异步渲染 同步提交
	if (!nextUnitOfWork && wipRoot) {
		commitRoot();
	}

	// 本次没有足够空闲时间 请求下一次浏览器空闲的时候执行
	requestIdleCallback(workLoop);
}
// 初始化执行workLoop
requestIdleCallback(workLoop);

function performUnitOfWork(fiber) {
	// 区分函数式组件
	const isFunctionComponent = fiber.type instanceof Function;
	if (isFunctionComponent) {
		updateFunctionComponent(fiber);
	} else {
		updateHostComponent(fiber);
	}

	// 按照Fiber架构渲染顺序
	// 有子节点 优先处理子节点
	if (fiber.child) {
		return fiber.child;
	}
	let nextFiber = fiber;
	while (nextFiber) {
		// 没有子节点的时候 优先处理兄弟节点
		if (nextFiber.sibling) {
			return nextFiber.sibling;
		}
		// 当此层的兄弟节点也处理完时
		// 返回其父节点 继续处理其父节点所在层的兄弟节点
		nextFiber = nextFiber.parent;
	}
}

// 处理非函数式组件
function updateHostComponent(fiber) {
	// 生成DOM
	if (!fiber.dom) {
		fiber.dom = createDOM(fiber);
	}
	const elements = fiber.props.children;
	reconcileChildren(fiber, elements);
}

/**
 * wipFiber相当于currentRoot.child
 * 在这里单独抽出来记录
 */
let wipFiber = null;
let hookIndex = null;

// 处理函数式组件
function updateFunctionComponent(fiber) {
	wipFiber = fiber;
	hookIndex = 0;
	wipFiber.hooks = [];
	const children = [fiber.type(fiber.props)];
	reconcileChildren(fiber, children);
}

export function useState(init) {
	const oldHook =
		wipFiber.alternate &&
		wipFiber.alternate.hooks &&
		wipFiber.alternate.hooks[hookIndex];

	const hook = {
		state: oldHook ? oldHook.state : init,
		queue: [],
	};

	const actions = oldHook ? oldHook.queue : [];
	actions.forEach((action) => {
		hook.state = typeof action === "function" ? action(hook.state) : action;
	});

	const setState = (action) => {
		hook.queue.push(action);
		wipRoot = {
			dom: currentRoot.dom,
			props: currentRoot.props,
			alternate: currentRoot,
		};
		// 触发页面重新渲染
		nextUnitOfWork = wipRoot;
		deletions = [];
	};

	wipFiber.hooks.push(hook);
	hookIndex++;
	return [hook.state, setState];
}

// diffing
function reconcileChildren(wipFiber, elements) {
	let index = 0;
	let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
	let prevSibling = null;
	while (index < elements.length || oldFiber) {
		const element = elements[index];
		const sameType = element && oldFiber && element.type === oldFiber.type;
		let newFiber = null;

		if (sameType) {
			// 更新
			newFiber = {
				type: oldFiber.type,
				props: element.props,
				dom: oldFiber.dom,
				parent: wipFiber,
				alternate: oldFiber,
				effectTag: "UPDATE",
			};
		}
		if (element && !sameType) {
			// 新建
			newFiber = {
				type: element.type,
				props: element.props,
				dom: null,
				parent: wipFiber,
				alternate: null,
				effectTag: "PLACEMENT",
			};
		}
		if (oldFiber && !sameType) {
			// 删除
			oldFiber.effectTag = "DELETION";
			deletions.push(oldFiber);
		}

		if (index === 0) {
			wipFiber.child = newFiber;
		} else {
			prevSibling.sibling = newFiber;
		}
		prevSibling = newFiber;

		if (oldFiber) {
			oldFiber = oldFiber.sibling;
		}
		index++;
	}
}
export default render;
