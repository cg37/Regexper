function drawRegExp(node) {

  let graphPadding = 10
  let lineWidth = 2
  function add(a, b) {
    return a + b
  }

  function svgElt(tagName, attrs = {}) {
    var tag = document.createElementNS(
      "http://www.w3.org/2000/svg",
      tagName
    )
    svg.appendChild(tag)
    for (let [key, val] of Object.entries(attrs)) {
      tag.setAttribute(key, val)
    }
    return tag
  }

  return drawRegExpGraph(node)

  /**
   * 接收类型为Character的语法树结点，返回它的绘制结果
   */
  function drawCharacterGraph(node) {
    var text = svgElt('text', {
      x: 0,
      y: 0,
      "dominant-baseline": "text-before-edge",
    })
    text.textContent = node.char

    var box = text.getBBox()

    var width = box.width + 10 * 2
    var height = box.height + 5 * 2

    text.setAttribute('transform', `translate(${(width - box.width) / 2}, ${(height - box.height) / 2})`)

    var rect = svgElt('rect', {
      x: 0,
      y: 0,
      rx: 3,
      fill: '#dae9e5',
      width: width,
      height: height,
    })

    var g = svgElt('g')
    g.appendChild(rect)
    g.appendChild(text)

    return g
  }

  function drawCharacterClassGraph(node) {
    var graphs = node.characters.map(drawCharacterGraph)
    var boxes = graphs.map(it => it.getBBox())

    var width = Math.max(...boxes.map(it => it.width)) + 2 * graphPadding
    var height = boxes.map(it => it.height).reduce(add, 0) + graphPadding * (boxes.length + 1)

    var rect = svgElt('rect', {
      width: width,
      height: height,
      fill: '#cbcbba',
      rx: 3,
    })

    var g = svgElt('g')
    g.appendChild(rect)

    var y = graphPadding
    graphs.forEach((graph, i) => {
      graph.setAttribute('transform', `translate(${(width - boxes[i].width) / 2}, ${y})`)
      y += boxes[i].height + graphPadding
      g.appendChild(graph)
    })

    return g
  }

  function drawBranchGraph(node) {
    // 先绘制出当前分支的每一部分的图形
    var graphs = node.parts.map(drawNodeGraph)
    var boxes = graphs.map(it => it.getBBox())

    var width = boxes.map(it => it.width).reduce(add, 0) + graphPadding * (graphs.length + 1)
    var height = Math.max(...boxes.map(it => it.height)) + 2 * graphPadding

    var rect = svgElt('rect', {
      width,
      height,
      fill: 'none',
      rx: 3,
    })

    var g = svgElt('g')
    g.appendChild(rect)

    var line = svgElt('line', {
      x1: 0,
      y1: height / 2,
      x2: width,
      y2: height / 2,
      stroke: 'black',
      'stroke-width': lineWidth,
    })
    g.appendChild(line)

    var x = graphPadding
    graphs.forEach((graph, i) => {
      graph.setAttribute('transform', `translate(${x}, ${(height - boxes[i].height) / 2})`)
      x += boxes[i].width + graphPadding
      g.appendChild(graph)
    })

    return g
  }

  // 绘制多个并列分支的图形
  function drawBranchesGraph(nodes) {
    var graphs = nodes.map(drawBranchGraph)
    var boxes = graphs.map(it => it.getBBox())

    var width = Math.max(...boxes.map(it => it.width)) + 4 * graphPadding
    var height = boxes.map(it => it.height).reduce(add, 0) + graphPadding * (boxes.length + 1)

    var rect = svgElt('rect', {
      width: width,
      height: height,
      fill: 'none',
      rx: 3,
    })

    var g = svgElt('g')
    g.appendChild(rect)

    var y = graphPadding
    graphs.forEach((graph, i) => {
      var x = (width - boxes[i].width) / 2
      graph.setAttribute('transform', `translate(${x}, ${y})`)

      var line = svgElt('path', {
        d: `M 0 ${height / 2}
            C ${graphPadding} ${height / 2} ${graphPadding} ${y + boxes[i].height / 2} ${graphPadding + graphPadding} ${y + boxes[i].height / 2}
            L ${x} ${y + boxes[i].height / 2}

            M ${width} ${height / 2}
            C ${width - graphPadding} ${height / 2} ${width - graphPadding} ${y + boxes[i].height / 2} ${width - (graphPadding + graphPadding)} ${y + boxes[i].height / 2}
            L ${width - x} ${y + boxes[i].height / 2}
        `,
        fill: 'none',
        stroke: 'black',
        'stroke-width': lineWidth,
      })

      g.appendChild(graph)
      g.appendChild(line)

      y += boxes[i].height + graphPadding
    })

    return g
  }

  function drawCaptureGroupGraph(node) {
    var branchesGraph = drawBranchesGraph(node.branches)
    var box = branchesGraph.getBBox()

    var width = box.width + 2 * graphPadding
    var height = box.height

    var rect = svgElt('rect', {
      width, height,
      rx: 3,
      stroke: '#908c83',
      'stroke-width': lineWidth,
      fill: 'none',
      "stroke-dasharray": '6 2',
    })
    var g = svgElt('g')
    g.appendChild(rect)

    var line = svgElt('path', {
      fill: 'none',
      stroke: 'black',
      'stroke-width': lineWidth,
      d: `
        M 0 ${height / 2} L ${graphPadding} ${height / 2}
        M ${width} ${height / 2} L ${width - graphPadding} ${height / 2}
      `
    })
    g.appendChild(line)

    branchesGraph.setAttribute('transform', `translate(${graphPadding}, 0)`)
    g.appendChild(branchesGraph)

    var label = svgElt('text', {
      x: 0,
      y: 0,
      "font-size": 10,
      "dominant-baseline": "text-before-edge",
    })
    label.textContent = 'Group #' + node.groupIndex
    g.appendChild(label)

    return g
  }

  function drawQuantifierGraph(node) {
    var targetGraph = drawNodeGraph(node.repeatTarget)
    var box = targetGraph.getBBox()

    var width = box.width + graphPadding * 4
    var height = box.height + graphPadding * 2

    var g = svgElt('g')

    var rect = svgElt('rect', {
      width, height,
      fill: 'none',
    })
    g.appendChild(rect)



    // 如果重复次数可以为0
    if (node.min == 0) {
      var upLine = svgElt('path', {
        fill: 'none',
        stroke: 'black',
        'stroke-width': lineWidth,
                              // 半长轴       半短轴      不旋转 劣弧  逆时针    目标点
        d: `
          M 0 ${height / 2} A ${graphPadding} ${graphPadding} 0 0 0 ${graphPadding} ${height / 2 - graphPadding}
          L ${graphPadding} ${graphPadding}
          A ${graphPadding} ${graphPadding} 0 0 1 ${graphPadding * 2} 0
          L ${width - 2 * graphPadding} 0
          A ${graphPadding} ${graphPadding} 0 0 1 ${width - graphPadding} ${graphPadding}
          L ${width - graphPadding} ${height / 2 - graphPadding}
          A ${graphPadding} ${graphPadding} 0 0 0 ${width} ${height / 2}
        `
      })
      g.appendChild(upLine)
    }


    // 如果重复次数可以大于1，才有下方的一条线
    if (node.max > 1) {
      var downLine = svgElt('path', {
        fill: 'none',
        stroke: 'black',
        'stroke-width': lineWidth,
        d: `
          M ${width - 2 * graphPadding} ${height / 2}
          A ${graphPadding} ${graphPadding} 0 0 1 ${width - graphPadding} ${height / 2 + graphPadding}
          L ${width - graphPadding} ${height - graphPadding}
          A ${graphPadding} ${graphPadding} 0 0 1 ${width - graphPadding * 2} ${height}
          L ${2 * graphPadding} ${height}
          A ${graphPadding} ${graphPadding} 0 0 1 ${graphPadding} ${height - graphPadding}
          L ${graphPadding} ${height / 2 + graphPadding}
          A ${graphPadding} ${graphPadding} 0 0 1 ${2 * graphPadding} ${height / 2}
        `
      })
      g.appendChild(downLine)
    }

    var line = svgElt('path', {
      fill: 'none',
      stroke: 'black',
      'stroke-width': lineWidth,
      d: `
        M 0 ${height / 2} L ${2 * graphPadding} ${height / 2}
        M ${width} ${height / 2} L ${width - 2 * graphPadding} ${height / 2}
      `
    })
    g.appendChild(line)

    targetGraph.setAttribute('transform', `translate(${2 * graphPadding}, ${(height - box.height) / 2})`)
    g.appendChild(targetGraph)

    return g
  }

  function drawRegularExpressionGraph(node) {
    var branchesGraph = drawBranchesGraph(node.branches)
    var box = branchesGraph.getBBox()

    var g = svgElt('g')

    var width = box.width + 4 * graphPadding
    var height = box.height + 2 * graphPadding

    var rect = svgElt('rect', {
      width,
      height,
      fill: 'none',
    })

    g.appendChild(rect)

    var line = svgElt('path', {
      fill: 'none',
      stroke: 'black',
      'stroke-width': lineWidth,
      d: `
        M ${graphPadding} ${height / 2} L ${2 * graphPadding} ${height / 2}
        M ${width - graphPadding} ${height / 2} L ${width - 2 * graphPadding} ${height / 2}
      `
    })
    g.appendChild(line)

    var leftCircle = svgElt('circle', {
      cx: graphPadding,
      cy: height / 2,
      r: 5,
      fill: '#6b6659',
      stroke: 'black',
    })
    g.appendChild(leftCircle)

    var rightCircle = svgElt('circle', {
      cx: width - graphPadding,
      cy: height / 2,
      r: 5,
      fill: '#6b6659',
      stroke: 'black',
    })
    g.appendChild(rightCircle)


    branchesGraph.setAttribute('transform', `translate(${2 * graphPadding}, ${graphPadding})`)
    g.appendChild(branchesGraph)

    return g
  }

  /**
   * 接收一个任意类型的结点，绘制出其图形
   */
  function drawNodeGraph(node) {
    if (Array.isArray(node)) {
      return drawBranchesGraph(node)
    }
    if (node.type == 'Quantifier') {
      return drawQuantifierGraph(node)
    }
    if (node.type == 'Character') {
      return drawCharacterGraph(node)
    }
    if (node.type == 'CharacterClass') {
      return drawCharacterClassGraph(node)
    }
    if (node.type == 'Branch') {
      return drawBranchGraph(node)
    }
    if (node.type == 'CaptureGroup') {
      return drawCaptureGroupGraph(node)
    }
  }
}
