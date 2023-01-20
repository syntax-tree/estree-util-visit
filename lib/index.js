/**
 * @typedef {import('estree-jsx').Node} Node
 */

/**
 * @typedef {CONTINUE | SKIP | EXIT} Action
 *   Union of the action types.
 *
 * @typedef {number} Index
 *   Move to the sibling at `index` next (after node itself is completely
 *   traversed).
 *
 *   Useful if mutating the tree, such as removing the node the visitor is
 *   currently on, or any of its previous siblings.
 *   Results less than 0 or greater than or equal to `children.length` stop
 *   traversing the parent.
 *
 * @typedef {[(Action | null | undefined | void)?, (Index | null | undefined)?]} ActionTuple
 *   List with one or two values, the first an action, the second an index.
 */

/**
 * @callback Visitor
 * @param {Node} node
 *   Found node.
 * @param {string | null} key
 *   Field at which `node` lives.
 * @param {number | null} index
 *   Position at which `node` lives.
 * @param {Array<Node>} ancestors
 *   Ancestors of node.
 * @returns {null | undefined | Action | Index | ActionTuple | void}
 */

/**
 * @typedef Visitors
 * @property {Visitor | null | undefined} [enter]
 * @property {Visitor | null | undefined} [leave]
 */

import {color} from './color.js'

const own = {}.hasOwnProperty

/**
 * Continue traversing as normal
 */
export const CONTINUE = Symbol('continue')
/**
 * Do not traverse this node’s children
 */
export const SKIP = Symbol('skip')
/**
 * Stop traversing immediately
 */
export const EXIT = Symbol('exit')

/**
 * Visit children of tree which pass a test.
 *
 * @param {Node} tree
 *   Abstract syntax tree to walk.
 * @param {Visitor | Visitors | null | undefined} [visitor]
 *   Function to run for each node.
 */
export function visit(tree, visitor) {
  /** @type {Visitor | undefined} */
  let enter
  /** @type {Visitor | undefined} */
  let leave

  if (typeof visitor === 'function') {
    enter = visitor
  } else if (visitor && typeof visitor === 'object') {
    if (visitor.enter) enter = visitor.enter
    if (visitor.leave) leave = visitor.leave
  }

  build(tree, null, null, [])()

  /**
   * @param {Node} node
   * @param {string | null} key
   * @param {number | null} index
   * @param {Array<Node>} parents
   */
  function build(node, key, index, parents) {
    if (nodelike(node)) {
      visit.displayName = 'node (' + color(node.type) + ')'
    }

    return visit

    /**
     * @returns {ActionTuple}
     */
    function visit() {
      /** @type {ActionTuple} */
      const result = enter ? toResult(enter(node, key, index, parents)) : []

      if (result[0] === EXIT) {
        return result
      }

      if (result[0] !== SKIP) {
        /** @type {keyof node} */
        let cKey

        for (cKey in node) {
          if (
            own.call(node, cKey) &&
            node[cKey] &&
            typeof node[cKey] === 'object' &&
            // @ts-expect-error: custom esast extension.
            cKey !== 'data' &&
            // @ts-expect-error: custom esast extension.
            cKey !== 'position'
          ) {
            const grandparents = parents.concat(node)
            /** @type {unknown} */
            const value = node[cKey]

            if (Array.isArray(value)) {
              const nodes = /** @type {Array<unknown>} */ (value)
              let cIndex = 0

              while (cIndex > -1 && cIndex < nodes.length) {
                const subvalue = nodes[cIndex]

                if (nodelike(subvalue)) {
                  const subresult = build(
                    subvalue,
                    cKey,
                    cIndex,
                    grandparents
                  )()
                  if (subresult[0] === EXIT) return subresult
                  cIndex =
                    typeof subresult[1] === 'number' ? subresult[1] : cIndex + 1
                } else {
                  cIndex++
                }
              }
            } else if (nodelike(value)) {
              const subresult = build(value, cKey, null, grandparents)()
              if (subresult[0] === EXIT) return subresult
            }
          }
        }
      }

      return leave ? toResult(leave(node, key, index, parents)) : result
    }
  }
}

/**
 * Turn a return value into a clean result.
 *
 * @param {Action | Index | ActionTuple | null | undefined | void} value
 *   Valid return values from visitors.
 * @returns {ActionTuple}
 *   Clean result.
 */
function toResult(value) {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'number') {
    return [CONTINUE, value]
  }

  return [value]
}

/**
 * Check if something looks like a node.
 *
 * @param {unknown} value
 *   Anything.
 * @returns {value is Node}
 *   Whether `value` looks like a node.
 */
function nodelike(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'type' in value &&
      typeof value.type === 'string' &&
      value.type.length > 0
  )
}
