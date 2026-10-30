export function preserveFormValues(form: HTMLFormElement) {
  // React resets uncontrolled fields when an action resolves, including validation errors.
  for (const element of Array.from(form.elements)) {
    if (element instanceof HTMLInputElement) {
      if (element.type === "checkbox" || element.type === "radio")
        element.defaultChecked = element.checked;
      else if (element.type !== "file") element.defaultValue = element.value;
    } else if (element instanceof HTMLTextAreaElement) element.defaultValue = element.value;
    else if (element instanceof HTMLSelectElement) {
      for (const option of Array.from(element.options)) option.defaultSelected = option.selected;
    }
  }
}
