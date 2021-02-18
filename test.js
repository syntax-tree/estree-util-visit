'use strict'

import assert from 'assert'
import test from 'tape'
import {parse} from 'acorn'
import {visit, EXIT, SKIP} from './index.js'

var tree = parse(
  'export function x() { console.log(1 + "2"); process.exit(1) }',
  {sourceType: 'module'}
)

var preorder = [
  'Program',
  'ExportNamedDeclaration',
  'FunctionDeclaration',
  'Identifier',
  'BlockStatement',
  'ExpressionStatement',
  'CallExpression',
  'MemberExpression',
  'Identifier',
  'Identifier',
  'BinaryExpression',
  'Literal',
  'Literal',
  'ExpressionStatement',
  'CallExpression',
  'MemberExpression',
  'Identifier',
  'Identifier',
  'Literal'
]

var postorder = [
  'Identifier',
  'Identifier',
  'Identifier',
  'MemberExpression',
  'Literal',
  'Literal',
  'BinaryExpression',
  'CallExpression',
  'ExpressionStatement',
  'Identifier',
  'Identifier',
  'MemberExpression',
  'Literal',
  'CallExpression',
  'ExpressionStatement',
  'BlockStatement',
  'FunctionDeclaration',
  'ExportNamedDeclaration',
  'Program'
]

test('estree-util-visit', function (t) {
  t.doesNotThrow(function () {
    visit(tree)
  }, 'should succeed w/o tree')

  var count = 0

  visit(tree, function (node) {
    assert.equal(node.type, preorder[count++])
  })

  t.equal(count, 19, 'should walk')

  count = 0

  visit(tree, {
    leave(node) {
      assert.equal(node.type, postorder[count++])
    }
  })

  t.equal(count, 19, 'should walk in postorder w/ `leave`')

  count = 0
  var postCount = 0

  visit(tree, {
    enter(node) {
      assert.equal(node.type, preorder[count++])
    },
    leave(node) {
      assert.equal(node.type, postorder[postCount++])
    }
  })

  t.equal(count, 19, 'should walk w/ both `enter` and `leave` (1)')
  t.equal(postCount, 19, 'should walk w/ both `enter` and `leave` (2)')

  count = 0

  visit(tree, function (node) {
    assert.equal(node.type, preorder[count++])
    if (node.type === 'CallExpression') return EXIT
  })

  t.equal(count, 7, 'should stop when EXIT is returned')

  count = 0

  visit(tree, function (node) {
    assert.equal(node.type, preorder[count++])
    if (node.type === 'CallExpression') return [EXIT]
  })

  t.equal(count, 7, 'should stop when EXIT in an array is returned')

  count = 0

  visit(tree, {
    leave(node) {
      assert.equal(node.type, postorder[count++])
      if (node.type === 'CallExpression') return EXIT
    }
  })

  t.equal(count, 8, 'should stop when EXIT is returned from `leave`')

  count = 0

  t.doesNotThrow(function () {
    visit(tree, {
      enter(node) {
        assert.equal(node.type, preorder[count++])
        if (node.type === 'CallExpression') return EXIT
      },
      leave(node) {
        assert.notEqual(node.type, 'CallExpression')
      }
    })
  }, 'should not call `leave` after `enter` returned EXIT')

  count = 0
  var skip = 0

  visit(tree, function (node) {
    assert.equal(node.type, preorder[count++ + skip])

    if (node.type === 'CallExpression') {
      skip = 6 // Skip a couple nodes.
      return SKIP
    }
  })

  t.equal(count, 9, 'should not walk a node when SKIP is returned')

  count = 0

  visit(tree, function (node, key, index) {
    assert.deepEqual(
      [key, index],
      count === 0
        ? [null, null]
        : count === 1
        ? ['body', 0]
        : ['declaration', null],
      '`key` and `index` (' + count + ')'
    )

    assert.equal(node.type, preorder[count++])

    if (node.type === 'FunctionDeclaration') return EXIT
  })

  t.equal(count, 3, 'should pass `key` and `index`')

  count = 0

  visit({type: 'Program', position: {type: '!'}}, function () {
    count++
  })

  t.equal(count, 1, 'should not walk into `position`')

  count = 0

  visit({type: 'Program', data: {type: '!'}}, function () {
    count++
  })

  t.equal(count, 1, 'should not walk into `data`')

  count = 0

  visit({type: 'Program', random: {type: '!'}}, function () {
    count++
  })

  t.equal(count, 2, 'should walk into other fields')

  count = 0

  visit({type: 'Program', random: [1, 2, {type: '!'}]}, function () {
    count++
  })

  t.equal(count, 2, 'should walk into arrays')

  tree = JSON.parse(
    JSON.stringify(
      parse(';[1, 2, 3, 4]', {sourceType: 'module'}).body[1].expression
    )
  )

  visit(tree, function (node, key, index, parents) {
    if (key === 'elements' && node.type === 'Literal' && node.value === 3) {
      // Remove the previous element.
      parents[parents.length - 1][key].splice(index - 1, 1)
      // Move to the element now at `index`.
      return index
    }
  })

  t.deepEqual(
    tree,
    {
      type: 'ArrayExpression',
      start: 1,
      end: 13,
      elements: [
        {type: 'Literal', start: 2, end: 3, value: 1, raw: '1'},
        {type: 'Literal', start: 8, end: 9, value: 3, raw: '3'},
        {type: 'Literal', start: 11, end: 12, value: 4, raw: '4'}
      ]
    },
    'should support removing a node and returning the next index'
  )

  t.end()
})
