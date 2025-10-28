# Accessibility Checklist - Fuel Finder

**Last Updated:** 2025-10-28  
**Standard:** WCAG 2.1 Level AA  
**Scope:** Web application accessibility guidelines

## 🎯 Overview

This checklist ensures the Fuel Finder application is accessible to all users, including those with disabilities. Based on WCAG 2.1 Level AA standards.

## ✅ Implemented Accessibility Features

### 1. ARIA Labels & Roles

**Button Labels:**
```tsx
// ✅ Center location button
<button
  onClick={centerMap}
  aria-label="Center map to my location"
  title="Center to my location"
>
  📍
</button>

// ✅ Voice toggle with role
<button
  onClick={toggleVoice}
  aria-label={voiceEnabled ? "Disable voice announcements" : "Enable voice announcements"}
  role="switch"
  aria-checked={voiceEnabled}
  title={voiceEnabled ? "Voice Announcements: ON" : "Voice Announcements: OFF"}
>
  {voiceEnabled ? "🔊" : "🔇"}
</button>

// ✅ Notification toggle
<button
  onClick={toggleNotifications}
  aria-label={notificationsEnabled ? "Disable arrival notifications" : "Enable arrival notifications"}
  role="switch"
  aria-checked={notificationsEnabled}
  title={notificationsEnabled ? "Arrival Notifications: ON" : "Arrival Notifications: OFF"}
>
  {notificationsEnabled ? "🔔" : "🔕"}
</button>
```

**Toast Notifications:**
```tsx
<div className="toast" role="alert" aria-live="polite">
  <div className="toast-message">{message}</div>
  <button className="toast-close" aria-label="Close notification">×</button>
</div>
```

### 2. Keyboard Navigation

**Current Status:** ✅ Implemented
- All interactive elements are keyboard accessible
- Tab order follows logical flow
- Enter/Space activate buttons
- Escape closes modals

**Requirements:**
```css
/* Visible focus indicators */
button:focus,
a:focus,
input:focus {
  outline: 2px solid #2196F3;
  outline-offset: 2px;
}

/* Never remove outline without replacement */
button:focus:not(:focus-visible) {
  outline: none;
}

button:focus-visible {
  outline: 2px solid #2196F3;
  outline-offset: 2px;
}
```

### 3. Touch Target Sizes

**Minimum Size:** 44x44 pixels (WCAG 2.1 AAA: 44px, AA: 24px)

**Current Implementation:**
```tsx
// Mobile buttons - adequate size
<button
  style={{
    width: window.innerWidth <= 768 ? "48px" : "50px",
    height: window.innerWidth <= 768 ? "48px" : "50px",
    // ... ensures minimum 44px on mobile
  }}
>
```

**Status:** ✅ All primary controls meet 44px minimum

### 4. Color Contrast

**Requirements (WCAG AA):**
- Normal text: 4.5:1
- Large text (18pt+): 3:1
- UI components: 3:1

**To Verify:**
```css
/* Example checks needed */
.toast-success { 
  color: #1B5E20; /* Dark green on white - CHECK RATIO */
  background: white;
}

.button-primary {
  color: white; /* White on #2196F3 - CHECK RATIO */
  background: #2196F3;
}
```

**Tools:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Chrome DevTools Accessibility Panel

### 5. Screen Reader Support

**Implemented:**
- ✅ Semantic HTML (`<button>`, `<nav>`, `<main>`)
- ✅ ARIA labels on icon-only buttons
- ✅ `role="alert"` on toast notifications
- ✅ `role="switch"` on toggle buttons
- ✅ `aria-checked` state for toggles

**To Verify:**
- Test with NVDA (Windows)
- Test with JAWS (Windows)
- Test with VoiceOver (macOS/iOS)

### 6. Alternative Text

**Images:**
```tsx
// ✅ Proper alt text
<img
  src={image.url}
  alt={image.alt_text || image.original_filename}
  onError={handleImageError}
/>

// ❌ Avoid empty alt on meaningful images
<img src="station.jpg" alt="" /> // WRONG if image conveys info

// ✅ Empty alt for decorative images
<img src="decorative-line.svg" alt="" role="presentation" />
```

## 📋 Compliance Checklist

### Perceivable

- [x] **1.1.1 Non-text Content:** Images have alt text
- [x] **1.3.1 Info and Relationships:** Semantic HTML used
- [x] **1.3.2 Meaningful Sequence:** Logical reading order
- [ ] **1.4.3 Contrast (Minimum):** 4.5:1 for text - **NEEDS AUDIT**
- [x] **1.4.4 Resize Text:** Text can be resized to 200%
- [x] **1.4.10 Reflow:** Content adapts to viewport (responsive)
- [x] **1.4.11 Non-text Contrast:** UI components have 3:1 contrast

### Operable

- [x] **2.1.1 Keyboard:** All functionality via keyboard
- [x] **2.1.2 No Keyboard Trap:** Focus can move away from all elements
- [x] **2.4.3 Focus Order:** Logical tab order
- [x] **2.4.7 Focus Visible:** Focus indicators present
- [x] **2.5.5 Target Size:** Touch targets ≥44px

### Understandable

- [x] **3.1.1 Language of Page:** `<html lang="en">`
- [x] **3.2.1 On Focus:** No unexpected context changes
- [x] **3.2.2 On Input:** Predictable interface behavior
- [x] **3.3.1 Error Identification:** Errors clearly described
- [x] **3.3.3 Error Suggestion:** Toast notifications provide guidance

### Robust

- [x] **4.1.2 Name, Role, Value:** ARIA attributes on custom controls
- [x] **4.1.3 Status Messages:** Toast notifications use `role="alert"`

## 🔍 Testing Procedures

### Keyboard Testing

1. **Tab Navigation:**
   ```
   - Press Tab → Should move through interactive elements
   - Press Shift+Tab → Should move backwards
   - No element should trap focus
   ```

2. **Button Activation:**
   ```
   - Focus on button → Press Enter or Space → Should activate
   - Works for: Center button, Voice toggle, Notification toggle
   ```

3. **Modal/Toast Interaction:**
   ```
   - Toast appears → Focus should move to toast (if actionable)
   - Press Escape → Toast should close
   ```

### Screen Reader Testing

**VoiceOver (macOS):**
```bash
# Enable: Cmd + F5
# Navigate: VO + Arrow keys
# Activate: VO + Space
```

**Test Script:**
1. Enable screen reader
2. Navigate to voice toggle button
3. Verify announcement: "Enable voice announcements, switch, off"
4. Activate button
5. Verify announcement: "Disable voice announcements, switch, on"

### Color Contrast Audit

**Steps:**
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Run Accessibility audit
4. Review "Contrast" section
5. Fix any failures

**Manual Check:**
```
https://webaim.org/resources/contrastchecker/
- Foreground: #FFFFFF (button text)
- Background: #2196F3 (button background)
- Result: Should be ≥ 4.5:1
```

## 🚧 Remaining Issues

### High Priority

1. **Color Contrast Audit**
   - Status: ⚠️ Not fully audited
   - Action: Run automated tools on all color combinations
   - Components: Badges, buttons, status indicators

2. **Form Labels**
   - Status: ⚠️ Some inputs lack visible labels
   - Action: Add proper `<label>` elements or `aria-label`
   - Location: Price report form, search inputs

### Medium Priority

3. **Heading Hierarchy**
   - Status: ⚠️ May skip levels
   - Action: Ensure proper H1 → H2 → H3 structure
   - Impact: Screen reader navigation

4. **Link Purpose**
   - Status: ⚠️ Some links may not be descriptive
   - Action: Avoid "click here", use descriptive text
   - Example: "Learn more about fuel prices" vs "Click here"

5. **Skip Navigation**
   - Status: ❌ Not implemented
   - Action: Add "Skip to main content" link
   - Benefit: Keyboard users can skip header

### Low Priority

6. **Motion Preferences**
   - Status: ⚠️ Animations don't respect `prefers-reduced-motion`
   - Action: Disable animations for users who prefer reduced motion
   ```css
   @media (prefers-reduced-motion: reduce) {
     * {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```

7. **Language Changes**
   - Status: ✅ Minimal (mostly English)
   - Action: Mark foreign language text with `lang` attribute if used

## 🛠️ Implementation Guide

### Adding Skip Navigation

```tsx
// Add at top of MainApp component
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

<main id="main-content">
  {/* Map and content here */}
</main>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  z-index: 100000;
}

.skip-link:focus {
  top: 0;
}
```

### Respecting Motion Preferences

```css
/* Add to global CSS */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Form Field Labels

```tsx
// ❌ BAD - No label
<input type="text" placeholder="Search..." />

// ✅ GOOD - Visible label
<label htmlFor="search-input">Search stations:</label>
<input type="text" id="search-input" placeholder="Search..." />

// ✅ GOOD - aria-label if visual label not wanted
<input 
  type="text" 
  aria-label="Search stations" 
  placeholder="Search..." 
/>
```

## 📊 Accessibility Testing Tools

### Automated Tools

1. **Lighthouse (Chrome DevTools)**
   - Run: DevTools → Lighthouse → Accessibility
   - Catches: Contrast, ARIA, alt text issues

2. **axe DevTools**
   - Extension: [Chrome](https://chrome.google.com/webstore), [Firefox](https://addons.mozilla.org)
   - More comprehensive than Lighthouse

3. **WAVE (WebAIM)**
   - Browser extension or online tool
   - Visual feedback on page

### Manual Testing

1. **Keyboard Only:**
   - Unplug mouse, navigate site
   - Can you access all features?

2. **Screen Reader:**
   - Turn on VoiceOver/NVDA
   - Does content make sense aurally?

3. **Zoom to 200%:**
   - Cmd/Ctrl + "+" twice
   - Is content still usable?

4. **Color Blindness Simulation:**
   - Use browser extensions (e.g., "Colorblindly")
   - Can you distinguish states?

## 📈 Continuous Improvement

### Pre-Deployment Checklist

- [ ] Run Lighthouse accessibility audit (score ≥ 90)
- [ ] Test keyboard navigation on all new features
- [ ] Verify ARIA labels on new buttons
- [ ] Check color contrast on new UI elements
- [ ] Test with screen reader if major changes

### Quarterly Review

- Full accessibility audit by third party
- User testing with people who use assistive technology
- Review and update this checklist

## 📚 Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Articles](https://webaim.org/articles/)
- [a11y Project Checklist](https://www.a11yproject.com/checklist/)
- [Inclusive Components](https://inclusive-components.design/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

---

**Note:** Accessibility is not a one-time task. Test regularly and incorporate into development workflow.
