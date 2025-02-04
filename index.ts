import { get } from "lodash";
import { readFile, writeFile } from "node:fs/promises";
import { format } from "prettier";

interface File {
  locale: string;
  filename: string;
  json?: any;
  translations: Record<string, string>;
}

// define source files (the first one is the "master")
const files: File[] = [
  { locale: "en", filename: "v69-en.json", translations: {} },
  { locale: "es", filename: "v69-es.json", translations: {} },
  { locale: "pt", filename: "v69-pt.json", translations: {} },
];

// if these string are included in either masterValue or breadCrumb, do not process the string
const blacklist: string[] = [
  "userLevel",
  "listType",
  "initialLevelType",
  "badge",
  "filename",
  "extension",
  ".type",
  "image",
  "onPass",
  "code",
  "locale",
  "productType",
  "single-frame",
  "currency",
  "barColor",
  "textColor",
  "buttonStyle",
];

const isBlacklisted = (str: string) => {
  return blacklist.filter((rule) => str.includes(rule)).length > 0;
};

const add = (masterValue: string, breadcrumb: string) => {
  if (masterValue === "") {
    return;
  }
  //console.info(`${breadcrumb}: ${masterValue}`);

  // ignore numeric ones
  if (!isNaN(parseInt(masterValue))) {
    return;
  }

  // some blacklist checks
  if (isBlacklisted(masterValue) || isBlacklisted(breadcrumb)) {
    return;
  }

  // find translations
  for (let x = 0; x < files.length; x += 1) {
    const { json = {}, translations } = files[x];
    const translationValue = get(json, breadcrumb);
    translations[masterValue] = translationValue || "";
  }
};

const handleObject = (jsonObject: any, breadcrumb: string) => {
  for (const [key, value] of Object.entries(jsonObject)) {
    let newBreadCrumb = breadcrumb === "" ? key : [breadcrumb, key].join(".");

    // strings are to be translated
    if (typeof value === "string") {
      add(value, newBreadCrumb);
      continue;
    }

    // if an array, iterate items
    if (Array.isArray(value)) {
      handleArray(value, newBreadCrumb);
      continue;
    }

    // if an object, recursion
    if (typeof value === "object") {
      handleObject(value, newBreadCrumb);
      continue;
    }

    // other types are not considered worthy
  }
};

const handleArray = (array: any[], breadcrumb: string) => {
  for (let k = 0; k < array.length; k += 1) {
    const value = array[k];
    const newBreadCrumb = [breadcrumb, k].join(".");

    // strings
    if (typeof value === "string") {
      add(value, newBreadCrumb);
      continue;
    }

    // objects
    if (typeof value === "object") {
      handleObject(value, newBreadCrumb);
      continue;
    }

    // other types are not considered worthy
  }
};

const execute = async () => {
  // read source files to an array
  for (let i = 0; i < files.length; i += 1) {
    const file = await readFile(files[i].filename, "utf-8");
    const json = JSON.parse(file);
    files[i].json = json;
  }

  // start iterating with a master root level
  handleObject(files[0].json, "");

  // output data
  for (let g = 0; g < files.length; g += 1) {
    const { locale, translations } = files[g];
    const output = await format(JSON.stringify(translations), {
      parser: "json",
    });
    writeFile(`output-${locale}.json`, output, "utf-8");
  }
};

// do it!
execute();
