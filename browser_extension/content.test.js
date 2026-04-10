const {
  boolToYesNo,
  setField,
  setNativeSelect,
  getReactSelectContainer,
  findByLabel,
  readGreenhouseAnswers,
  readLeverAnswers,
} = require('./content')

beforeEach(() => {
  document.body.innerHTML = ''
})

// ---------------------------------------------------------------------------
// boolToYesNo
// ---------------------------------------------------------------------------

describe('boolToYesNo', () => {
  test('true → "Yes"', () => expect(boolToYesNo(true)).toBe('Yes'))
  test('false → "No"', () => expect(boolToYesNo(false)).toBe('No'))
  test('null → null', () => expect(boolToYesNo(null)).toBeNull())
  test('arbitrary string → null', () => expect(boolToYesNo('yes')).toBeNull())
})

// ---------------------------------------------------------------------------
// setNativeSelect
// ---------------------------------------------------------------------------

function makeSelect(options) {
  const sel = document.createElement('select')
  options.forEach(([val, text]) => {
    const opt = document.createElement('option')
    opt.value = val
    opt.text = text
    sel.appendChild(opt)
  })
  document.body.appendChild(sel)
  return sel
}

describe('setNativeSelect', () => {
  test('selects by exact value (case-insensitive)', () => {
    const sel = makeSelect([['us', 'United States'], ['ca', 'Canada']])
    setNativeSelect(sel, 'US')
    expect(sel.value).toBe('us')
  })

  test('selects by partial text match', () => {
    const sel = makeSelect([['us', 'United States'], ['ca', 'Canada']])
    setNativeSelect(sel, 'canada')
    expect(sel.value).toBe('ca')
  })

  test('does nothing when value is null', () => {
    const sel = makeSelect([['us', 'United States']])
    sel.value = 'us'
    setNativeSelect(sel, null)
    expect(sel.value).toBe('us')
  })

  test('does nothing when el is null', () => {
    expect(() => setNativeSelect(null, 'us')).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// getReactSelectContainer
// ---------------------------------------------------------------------------

describe('getReactSelectContainer', () => {
  test('returns nearest ancestor with a class ending in "-container"', () => {
    document.body.innerHTML = `
      <div class="css-abc-container">
        <div class="css-abc-control">
          <input id="rs-input" />
        </div>
      </div>
    `
    const input = document.getElementById('rs-input')
    const container = getReactSelectContainer(input)
    expect(container).not.toBeNull()
    expect(container.className).toContain('-container')
  })

  test('returns null when no -container ancestor exists', () => {
    document.body.innerHTML = '<div><input id="plain" /></div>'
    expect(getReactSelectContainer(document.getElementById('plain'))).toBeNull()
  })

  test('returns null for null input', () => {
    expect(getReactSelectContainer(null)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// findByLabel
// ---------------------------------------------------------------------------

describe('findByLabel', () => {
  test('finds input linked via for attribute', () => {
    document.body.innerHTML = `
      <label for="fname">First Name</label>
      <input id="fname" />
    `
    expect(findByLabel('first name')).toBe(document.getElementById('fname'))
  })

  test('finds input nested inside the label element', () => {
    document.body.innerHTML = `
      <label>Email <input id="email-field" /></label>
    `
    expect(findByLabel('email')).toBe(document.getElementById('email-field'))
  })

  test('is case-insensitive', () => {
    document.body.innerHTML = `
      <label for="ph">PHONE</label><input id="ph" />
    `
    expect(findByLabel('phone')).not.toBeNull()
  })

  test('returns null when label text does not match', () => {
    document.body.innerHTML = `
      <label for="x">Phone</label><input id="x" />
    `
    expect(findByLabel('fax')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// readGreenhouseAnswers
// ---------------------------------------------------------------------------

describe('readGreenhouseAnswers', () => {
  test('reads a custom text field by label', () => {
    document.body.innerHTML = `
      <label for="pronouns">Preferred Pronouns</label>
      <input id="pronouns" value="they/them" />
    `
    const answers = readGreenhouseAnswers()
    expect(answers['preferred pronouns']).toBe('they/them')
  })

  test('skips standard fields (first_name, email, etc.)', () => {
    document.body.innerHTML = `
      <label for="first_name">First Name</label>
      <input id="first_name" value="Aaron" />
      <label for="email">Email</label>
      <input id="email" value="aaron@example.com" />
    `
    const answers = readGreenhouseAnswers()
    expect(Object.keys(answers)).toHaveLength(0)
  })

  test('skips fields with empty values', () => {
    document.body.innerHTML = `
      <label for="cover_note">Cover Note</label>
      <input id="cover_note" value="" />
    `
    expect(readGreenhouseAnswers()).not.toHaveProperty('cover note')
  })

  test('strips asterisks from label text keys', () => {
    document.body.innerHTML = `
      <label for="auth">Work Authorization *</label>
      <input id="auth" value="Yes" />
    `
    const answers = readGreenhouseAnswers()
    expect(answers['work authorization']).toBe('Yes')
  })
})

// ---------------------------------------------------------------------------
// readLeverAnswers
// ---------------------------------------------------------------------------

describe('readLeverAnswers', () => {
  test('reads a custom field not in the skip list', () => {
    document.body.innerHTML = `
      <label for="start">Earliest Start Date</label>
      <input id="start" value="2025-06-01" />
    `
    const answers = readLeverAnswers()
    expect(answers['earliest start date']).toBe('2025-06-01')
  })

  test('skips standard Lever fields (name, email, phone)', () => {
    document.body.innerHTML = `
      <label for="n">Name</label><input id="n" name="name" value="Aaron" />
      <label for="e">Email</label><input id="e" name="email" value="a@b.com" />
    `
    expect(readLeverAnswers()).toEqual({})
  })
})
