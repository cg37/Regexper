function parseRegExp(input) {

  let str = input // '(foo){2,55}?foo(b(ar)|baz|baa)[baz]' // '(foo+|()|aaaa)*b(a[a-z0-9_-]){2,}?(baz|baa)+|baaaa'
  let i = 0
  let groupIndex = 1 // 记录全局的分组编号

  let branches = parseBranches()

  return {
    type: 'RegularExpression',
    start: 0,
    end: input.length,
    raw: input,
    branches: branches,
  }

  /**
   * node = {
   *   type: 'Quantifier/CaptureGroup/Character/CharacterClass/Branch/...',
   *
   * }
   *
   * CaptureGroup = {
   *   type: 'CaptureGroup',
   *   start: 2,
   *   end: 5,
   *   raw: '(aaa|bbb)'
   *   groupIndex: 2,
   *   branches: []
   * }
   *
   * Branch = {
   *   type: 'Branch',
   *   parts: [Character, CaptureGroup, Quantifier]
   * }
   */

  function parseOnePart() {
    if (str[i] === '(') {
      return parseCaptureGroup()
    }
    if (str[i] === '[') {
      return parseCharacterClass()
    }
    if (str[i] === '{' || str[i] === '?' || str[i] === '+' || str[i] === '*') {
      return parseQuantifier()
    }
    return parseCharacter()
  }

  function parseCaptureGroup() {
    let node = {
      type: 'CaptureGroup',
      start: i,
      end: 0,
      raw: '',
      branches: [],

      //  (?=exp)   正预测 先行断言 匹配某个位置，其后面的内容匹配表达式exp
      //  (?<=exp)  正回顾 后发断言 匹配一个位置，其前边的内容匹配表达式exp
      //  (?!foo)   负预测 先行断言，匹配某个位置，其后面的内容不匹配表达式exp
      //  (?<!foo)  负回顾 后发断言, 匹配某个位置, 其前面的内容不匹配表达式exp
      assertion: false,     // 是否为零宽断言，为真时以下两个属性才有意义
      positive: true,       // 是否为正向零宽断言，为真为表示正向断言，为假表示反向断言
      lookahead: true,      // 是向右看还是向左看，为真表示向右看，为假表示向左看

      groupIndex: -1,       // 分组在这个正则中的编号，从1开始，为0时表示非捕获分组
      groupName: undefined,

      nonCapture: false,
    }

    i++     //skip '('

    if (str[i] === '?') {
      i++ // 跳过这个问号
      if (str[i] === ':') {   // 非捕获分组，由groupIndex为-1表示，所以这里什么都不用做
        i++
        node.nonCapture = true   //非捕获分组
      } else if (str[i] === '=') {  // 正预测断言，即右边满足条件
        i++
        node.assertion = true
      } else if (str[i] === '!') { // 负预测断言，即右侧不满足条件
        i++
        node.assertion = true
        node.positive = false
      } else if (str[i] === '<') { // 可能是具名分组，也可能是后发断言
        i++ //跳过'<'
        if (str[i] === '=') {     //(?<= 正回顾 后发断言
          i++
          node.assertion = true
          node.lookahead = false
        } else if (str[i] === '!') {  //(?<! 负回顾 后发断言 左边不满足条件
          i++
          node.assertion = true
          node.positive = false
          node.lookahead = false
        } else {
          let groupName = parseGroupName()
          if (groupName === '') {
            throw new SyntaxError("GroupName 不能为空")
          }
          node.groupName = groupName
          i++ // 跳过最后一个 '>'
        }
      }
    }

    if (!node.nonCapture) {
      node.groupIndex = groupIndex++
    }

    let branches = parseBranches()
    node.branches = branches
    i++   //skip ')'

    node.end = i
    node.raw = str.slice(node.start, node.end)
    return node
  }

  function parseGroupName() {
    let start = i
    while(str[i] !== '>') {
      i++
    }
    return str.slice(start, i)
  }

  function parseBranches() {
    let branches = []
    // 应对空括号
    if (str[i] === ')') {
      return branches
    }
    while (i < str.length) {
      let branch = parseBranch()
      branches.push(branch)
      if (str[i] === ')') {
        break
      }
      if (str[i] === '|') {
        i++
        continue
      }
    }

    return branches
  }

  function parseBranch() {
    let node = {
      type: 'Branch',
      start: i,
      end: 0,
      raw: '',
      parts: []
    }

    if (str[i] === '|' || str[i] === ')' || i >= str.length) {
      node.end = i
      node.raw = str.slice(node.start, node.end)
      return node
    }

    while(true) {
      let part = parseOnePart()
      // 如果解析出来的这一部分是量词，应该把前面解析出来的一部分做为量词重复的目标
      if (part.type === "Quantifier") {
        let repeatTarget = node.parts.pop()
        if (repeatTarget === undefined) {
          throw new SyntaxError(`No repeat part at ${i}`)
        }
        // 这个量词的前面如果也是一个量词，则语法错误
        if (repeatTarget.type === "Quantifier") {
          throw new SyntaxError(`Quantifier can not repeat at ${i}`)
        }
        // 正常情况下，量词应该与其前一部分合并成新一个部分
        part.repeatTarget = repeatTarget
        part.start = repeatTarget.start
        part.raw = str.slice(part.start, part.end)
      }
      node.parts.push(part)
      if (str[i] === '|' || str[i] === ')' || i >= str.length) {
        break
      }
    }

    node.end = i
    node.raw = str.slice(node.start, node.end)
    return node
  }

  function parseCharacter() {
    let node = {
      type: "Character",
      start: i,
      end: 0,
      raw: '',
      char: str[i],
    }
    i++

    node.end = i
    node.raw = str.slice(node.start, node.end)
    return node
  }

  function parseCharacterClass() {    //解析[]
    let node = {
      type: "CharacterClass",
      start: i,
      end: 0,
      raw: '',
      characters: [],
      invert: false,  //取反
    }

    i++ // skip first '['
    if (str[i] === '^') {
      node.invert = true
      i++ // skip this '^'
    }

    while (true) {
      if (str[i] === ']') {
        i++
        break
      }
      let char = parseCharacter()
      node.characters.push(char)

      if (str[i] === '-') {   //字符范围
        i++
        if (str[i] === ']') { // 说明表示范围的中划线在最后，则它是一个普通的中划线符号
          i--
          let char = parseCharacter()
          node.characters.push(char)
          continue
        }
        let char = parseCharacter()
        let prevChar = node.characters.pop()
        if (char.char < prevChar.char) {
          throw new SyntaxError('prev Char can NOT bigger than char')
        }
        let rangeNode = {
          type: 'CharacterRange',
          start: prevChar.start,
          end: char.end,
          raw: str.slice(prevChar.start, char.end),
          startChar: prevChar,
          endChar: char,
        }
        node.characters.push(rangeNode)
      }
    }

    node.end = i
    node.raw = str.slice(node.start, node.end)
    return node
  }

  function parseQuantifier() {
    let node = {
      type: "Quantifier",
      start: i,
      end: 0,
      raw: '',
      min: 0,
      max: Infinity,
      greedy: true,
      repeatTarget: null,
    }
    if (str[i] === '+') {
      node.min = 1
      i++
    } else if (str[i] === '?') {
      node.max = 1
      i++
    } else if (str[i] === '*') {
      i++
    } else if (str[i] === '{') {
      i++
      node.min = parseInteger()
      if (str[i] === '}') {
        node.max = node.min
        i++
      } else if (str[i] === ',') {
        i++
        if (str[i] === '}') {
          i++
        } else {
          node.max = parseInteger()
          i++
        }
      }
    }

    if (str[i] === '?') {
      node.greedy = false
      i++
    }

    node.end = i
    node.raw = str.slice(node.start, node.end)
    return node
  }

  function parseInteger() {
    let start = i
    while(str[i] >= '0' && str[i] <= '9') {
      i++
    }
    return parseInt(str.slice(start, i))
  }


}


