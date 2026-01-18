const { exec } = require('child_process');
const fs = require('fs');

console.log("Starting flatten process...");

// Execute hardhat flatten
// Increase maxBuffer to handle large output
exec('npx hardhat flatten contracts/HashRush.sol', { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error) {
        console.error(`exec error: ${error}`);
        return;
    }

    console.log("Flatten command executed. Cleaning output...");

    // Split into lines
    let lines = stdout.split(/\r?\n/);

    // Find the first line that looks like a pragma or SPDX license or comment
    // Usually hardhat flatten outputs SPDX licensure for each file

    // We want to remove any initial logs from dotenv or hardhat
    // Strategy: Look for the first "// Sources flattened" or "// SPDX-License-Identifier"

    let startIndex = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('// Sources flattened') || line.startsWith('// SPDX-License-Identifier')) {
            startIndex = i;
            break;
        }
    }

    // If we found a start index, slice the array
    if (startIndex > 0) {
        lines = lines.slice(startIndex);
    } else {
        // Fallback: Filter out known junk lines
        lines = lines.filter(line =>
            !line.startsWith('[dotenv') &&
            !line.startsWith('Downloading') &&
            !line.startsWith('Compiled') &&
            !line.startsWith('Nothing to compile')
        );
    }

    const cleanContent = lines.join('\n');

    fs.writeFileSync('contracts/HashRush_Flat_Clean.sol', cleanContent, 'utf8');
    console.log('Success! Cleaned file saved to contracts/HashRush_Flat_Clean.sol');
});
