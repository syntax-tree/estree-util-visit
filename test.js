/**
 * @typedef {import('estree-jsx').Program} Program
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import {parse} from 'acorn'
import {EXIT, SKIP, visit} from './index.js'

test('visit', async function (t) {
  /** @type {Program} */
  // @ts-expect-error: acorn looks like estree.
  const tree = parse(
    'export function x() { console.log(1 + "2"); process.exit(1) }',
    {sourceType: 'module', ecmaVersion: 2021}
  )

  const preorder = [
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

  const postorder = [
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

  await t.test('should expose the public api', async function () {
    assert.deepEqual(Object.keys(await import('./index.js')).sort(), [
      'CONTINUE',
      'EXIT',
      'SKIP',
      'visit'
    ])
  })

  await t.test('should succeed w/o tree', async function () {
    assert.doesNotThrow(function () {
      visit(tree)
    })
  })

  await t.test('should walk', async function () {
    let count = 0

    visit(tree, {
      enter(node) {
        assert.equal(node.type, preorder[count++])
      }
    })

    assert.equal(count, 19)
  })

  await t.test('should walk in postorder w/ `leave`', async function () {
    let count = 0

    visit(tree, {
      leave(node) {
        assert.equal(node.type, postorder[count++])
      }
    })

    assert.equal(count, 19)
  })

  await t.test('should walk w/ both `enter` and `leave`', async function () {
    let count = 0
    let postCount = 0

    visit(tree, {
      enter(node) {
        assert.equal(node.type, preorder[count++])
      },
      leave(node) {
        assert.equal(node.type, postorder[postCount++])
      }
    })

    assert.deepEqual([count, postCount], [19, 19])
  })

  await t.test('should stop when EXIT is returned', async function () {
    let count = 0

    visit(tree, function (node) {
      assert.equal(node.type, preorder[count++])
      if (node.type === 'CallExpression') return EXIT
    })

    assert.equal(count, 7)
  })

  await t.test(
    'should stop when EXIT in an array is returned',
    async function () {
      let count = 0

      visit(tree, function (node) {
        assert.equal(node.type, preorder[count++])
        if (node.type === 'CallExpression') return [EXIT]
      })

      assert.equal(count, 7)
    }
  )

  await t.test(
    'should stop when EXIT is returned from `leave`',
    async function () {
      let count = 0

      visit(tree, {
        leave(node) {
          assert.equal(node.type, postorder[count++])
          if (node.type === 'CallExpression') return EXIT
        }
      })

      assert.equal(count, 8)
    }
  )

  await t.test(
    'should not call `leave` after `enter` returned EXIT',
    async function () {
      let count = 0

      assert.doesNotThrow(function () {
        visit(tree, {
          enter(node) {
            assert.equal(node.type, preorder[count++])
            if (node.type === 'CallExpression') return EXIT
          },
          leave(node) {
            assert.notEqual(node.type, 'CallExpression')
          }
        })
      })
    }
  )

  await t.test(
    'should not walk a node when SKIP is returned',
    async function () {
      let count = 0
      let skip = 0

      visit(tree, function (node) {
        assert.equal(node.type, preorder[count++ + skip])

        if (node.type === 'CallExpression') {
          skip = 6 // Skip a couple nodes.
          return SKIP
        }
      })

      assert.equal(count, 9)
    }
  )

  await t.test('should pass `key` and `index`', async function () {
    let count = 0

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

    assert.equal(count, 3)
  })

  await t.test('should not walk into `position`', async function () {
    let count = 0

    /** @type {Program} */
    const nodeWithPosition = {
      type: 'Program',
      sourceType: 'module',
      body: [],
      // @ts-expect-error: custom esast extension.
      position: {type: '!'}
    }

    visit(nodeWithPosition, function () {
      count++
    })

    assert.equal(count, 1)
  })

  await t.test('should not walk into `data`', async function () {
    let count = 0

    /** @type {Program} */
    const nodeWithData = {
      type: 'Program',
      sourceType: 'module',
      body: [],
      // @ts-expect-error: custom esast extension.
      data: {type: '!'}
    }

    visit(nodeWithData, function () {
      count++
    })

    assert.equal(count, 1)
  })

  await t.test('should walk into other fields', async function () {
    let count = 0

    /** @type {Program} */
    const nodeWithRandomField = {
      type: 'Program',
      sourceType: 'module',
      body: [],
      // @ts-expect-error: random extension.
      random: {type: '!'}
    }

    visit(nodeWithRandomField, function () {
      count++
    })

    assert.equal(count, 2)
  })

  await t.test('should walk into arrays', async function () {
    let count = 0

    /** @type {Program} */
    const nodeWithAnotherRandomField = {
      type: 'Program',
      sourceType: 'module',
      body: [],
      // @ts-expect-error: random extension.
      random: [1, 2, {type: '!'}]
    }

    visit(nodeWithAnotherRandomField, function () {
      count++
    })

    assert.equal(count, 2)
  })

  await t.test(
    'should support removing a node and returning the next index',
    async function () {
      /** @type {Program} */
      const program = JSON.parse(
        JSON.stringify(
          parse(';[1, 2, 3, 4]', {sourceType: 'module', ecmaVersion: 2021})
        )
      )

      const expressionStatement = program.body[1]
      assert(expressionStatement.type === 'ExpressionStatement')
      const tree = expressionStatement.expression

      visit(tree, function (node, key, index, parents) {
        const parent = parents[parents.length - 1]

        if (
          parent &&
          parent.type === 'ArrayExpression' &&
          index !== null &&
          key === 'elements' &&
          node.type === 'Literal' &&
          'value' in node &&
          node.value === 3
        ) {
          const list = parent[key]
          list.splice(index - 1, 1)
          // Move to the element now at `index`.
          return index
        }
      })

      assert.deepEqual(tree, {
        type: 'ArrayExpression',
        start: 1,
        end: 13,
        elements: [
          {type: 'Literal', start: 2, end: 3, value: 1, raw: '1'},
          {type: 'Literal', start: 8, end: 9, value: 3, raw: '3'},
          {type: 'Literal', start: 11, end: 12, value: 4, raw: '4'}
        ]
      })
    }
  )
})
