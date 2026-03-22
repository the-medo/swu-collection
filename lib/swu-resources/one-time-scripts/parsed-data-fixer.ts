import path from 'path';
import { promises as fsPromises } from 'fs';

const directoryPath = path.join(__dirname, './output/cards');

async function modifyFileContent(filePath: string) {
  try {
    const data = await fsPromises.readFile(filePath, 'utf8');
    let willRename = false;

    const jsonData = JSON.parse(data);

    if (jsonData.printings) {
      jsonData.variants = jsonData.printings.map((p: any) => ({
        ...p,
        variantId: p.image.front.replace('-front.webp', ''),
      }));
      delete jsonData.printings;
    }

    if (jsonData.cardId.endsWith('--')) {
      willRename = true;
      jsonData.cardId = jsonData.cardId.slice(0, -2);
    }

    if (jsonData.subtitle === '') {
      jsonData.name = jsonData.name.slice(0, -2);
      jsonData.subtitle = null;
    }

    await fsPromises.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8');

    if (willRename) {
      const newFilePath = path.join(directoryPath, `${jsonData.cardId}.json`);
      await fsPromises.rename(filePath, newFilePath);
    }
  } catch (error) {
    console.log(`Error occurred while modifying file ${filePath}: `, error);
  }
}

async function processDirectory() {
  try {
    const files = await fsPromises.readdir(directoryPath);

    const jsonFiles = files.filter(file => path.extname(file) === '.json');

    for (const file of jsonFiles) {
      await modifyFileContent(path.join(directoryPath, file));
    }
  } catch (error) {
    console.log(`Error occurred while processing directory ${directoryPath}: `, error);
  }
}

processDirectory();
