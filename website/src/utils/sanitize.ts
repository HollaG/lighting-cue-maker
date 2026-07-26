import DOMPurify from "dompurify";

export const sanitize = (inputStr: string) => {
  // Temporary: convert all <cueId and cueId> to { }
  const tempStr = inputStr
    .replaceAll("<cueId=", "{cueId=")
    .replaceAll("<bumpId=", "{bumpId=")
    .replaceAll("=cueId>", "=cueId}")
    .replaceAll("=bumpId>", "=bumpId}");

  const cleaned = DOMPurify.sanitize(tempStr, {
    ALLOWED_TAGS: ["sub", "sup", "span"],
    ALLOWED_ATTR: ["class", "id"],
    // ADD_TAGS: ["cueId", "bumpId"],
    CUSTOM_ELEMENT_HANDLING: {
      tagNameCheck: /.*/i,
      // Allows any attributes on these tags, or you can use /.*/
      attributeNameCheck: /.*/,
      allowCustomizedBuiltInElements: true,
    },
  });

  return cleaned;
};
