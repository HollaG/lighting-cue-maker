import DOMPurify from "dompurify";

export const sanitize = (inputStr: string) => {
  console.log({ inputStr });
  const cleaned = DOMPurify.sanitize(inputStr, {
    ALLOWED_TAGS: ["sub", "sup"],
    // ADD_TAGS: ["cueId", "bumpId"],
    CUSTOM_ELEMENT_HANDLING: {
      tagNameCheck: /.*/i,
      // Allows any attributes on these tags, or you can use /.*/
      attributeNameCheck: /.*/,
      allowCustomizedBuiltInElements: true,
    },
  });

  console.log({ cleaned });
  return inputStr;
};
