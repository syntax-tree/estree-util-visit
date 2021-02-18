import {color} from './color.js'

var own = {}.hasOwnProperty

export var CONTINUE = Symbol('continue')
export var SKIP = Symbol('skip')
export var EXIT = Symbol('exit')

export function visit(tree, visitor) {
  var enter = visitor
  var leave

  if (visitor && typeof visitor === 'object') {
    enter = visitor.enter
    leave = visitor.leave
  }

  build(tree, null, null, [])()

  function build(node, key, index, parents) {
    if (nodelike(node)) {
      visit.displayName = 'node (' + color(node.type) + ')'
    }

    return visit

    function visit() {
      var result = enter ? toResult(enter(node, key, index, parents)) : []
      var cKey
      var cIndex
      var cParents
      var cResult

      if (result[0] === EXIT) {
        return result
      }

      if (result[0] !== SKIP) {
        for (cKey in node) {
          if (
            own.call(node, cKey) &&
            node[cKey] &&
            typeof node[cKey] === 'object' &&
            cKey !== 'data' &&
            cKey !== 'position'
          ) {
            cParents = parents.concat(node)

            if (Array.isArray(node[cKey])) {
              cIndex = 0

              while (cIndex > -1 && cIndex < node[cKey].length) {
                if (nodelike(node[cKey][cIndex])) {
                  cResult = build(node[cKey][cIndex], cKey, cIndex, cParents)()
                  if (cResult[0] === EXIT) return cResult
                  cIndex =
                    typeof cResult[1] === 'number' ? cResult[1] : cIndex + 1
                } else {
                  cIndex++
                }
              }
            } else if (nodelike(node[cKey])) {
              cResult = build(node[cKey], cKey, null, cParents)()
              if (cResult[0] === EXIT) return cResult
            }
          }
        }
      }

      return leave ? toResult(leave(node, key, index, parents)) : result
    }
  }
}

function toResult(value) {
  if (value !== null && typeof value === 'object' && 'length' in value) {
    return value
  }

  if (typeof value === 'number') {
    return [CONTINUE, value]
  }

  return [value]
}

function nodelike(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof value.type === 'string' &&
      value.type.length
  )
}
