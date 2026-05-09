<?php

namespace App\Http\Controllers\Api\Concerns;

use RuntimeException;

trait DownloadsXlsxExports
{
    protected function downloadXlsx(string $filename, string $sheetName, array $headings, array $rows)
    {
        $tempDir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'khivo-xlsx-'.uniqid('', true);
        $xlsxPath = $tempDir.'.xlsx';

        if (! is_dir($tempDir) && ! mkdir($tempDir, 0777, true) && ! is_dir($tempDir)) {
            throw new RuntimeException('Unable to create temporary export directory.');
        }

        $this->writeXlsxStructure($tempDir, $sheetName, $headings, $rows);
        $this->zipXlsxDirectory($tempDir, $xlsxPath);
        $this->deleteDirectory($tempDir);

        return response()->download(
            $xlsxPath,
            $filename,
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        )->deleteFileAfterSend(true);
    }

    protected function writeXlsxStructure(string $tempDir, string $sheetName, array $headings, array $rows): void
    {
        $this->ensureDirectory($tempDir.'/_rels');
        $this->ensureDirectory($tempDir.'/docProps');
        $this->ensureDirectory($tempDir.'/xl/_rels');
        $this->ensureDirectory($tempDir.'/xl/worksheets');

        $allRows = [$headings, ...$rows];

        file_put_contents($tempDir.'/[Content_Types].xml', $this->contentTypesXml());
        file_put_contents($tempDir.'/_rels/.rels', $this->rootRelationshipsXml());
        file_put_contents($tempDir.'/docProps/app.xml', $this->appPropertiesXml($sheetName));
        file_put_contents($tempDir.'/docProps/core.xml', $this->corePropertiesXml());
        file_put_contents($tempDir.'/xl/workbook.xml', $this->workbookXml($sheetName));
        file_put_contents($tempDir.'/xl/_rels/workbook.xml.rels', $this->workbookRelationshipsXml());
        file_put_contents($tempDir.'/xl/styles.xml', $this->stylesXml());
        file_put_contents($tempDir.'/xl/worksheets/sheet1.xml', $this->worksheetXml($allRows));
    }

    protected function zipXlsxDirectory(string $sourceDir, string $xlsxPath): void
    {
        $pclZipPath = base_path('vendor/phpoffice/phpexcel/Classes/PHPExcel/Shared/PCLZip/pclzip.lib.php');

        if (! file_exists($pclZipPath)) {
            throw new RuntimeException('PclZip library not found for XLSX export.');
        }

        require_once $pclZipPath;

        $files = collect(scandir($sourceDir) ?: [])
            ->reject(fn ($entry) => $entry === '.' || $entry === '..')
            ->map(fn ($entry) => $sourceDir.'/'.$entry)
            ->flatMap(fn ($path) => $this->collectPathsRecursively($path))
            ->values()
            ->all();

        $archive = new \PclZip();
        $archive->PclZip($xlsxPath);
        $result = $archive->create($files, PCLZIP_OPT_REMOVE_PATH, $sourceDir);

        if ($result === 0) {
            throw new RuntimeException('Failed to create XLSX archive: '.$archive->errorInfo(true));
        }
    }

    protected function collectPathsRecursively(string $path): array
    {
        if (is_file($path)) {
            return [$path];
        }

        if (! is_dir($path)) {
            return [];
        }

        $results = [];

        foreach (scandir($path) ?: [] as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }

            array_push($results, ...$this->collectPathsRecursively($path.'/'.$entry));
        }

        return $results;
    }

    protected function ensureDirectory(string $path): void
    {
        if (! is_dir($path) && ! mkdir($path, 0777, true) && ! is_dir($path)) {
            throw new RuntimeException('Unable to create export directory: '.$path);
        }
    }

    protected function deleteDirectory(string $path): void
    {
        if (! is_dir($path)) {
            return;
        }

        foreach (scandir($path) ?: [] as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }

            $entryPath = $path.'/'.$entry;

            if (is_dir($entryPath)) {
                $this->deleteDirectory($entryPath);
            } else {
                @unlink($entryPath);
            }
        }

        @rmdir($path);
    }

    protected function contentTypesXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
XML;
    }

    protected function rootRelationshipsXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
XML;
    }

    protected function workbookXml(string $sheetName): string
    {
        $sheetName = $this->xmlEscape($sheetName);

        return <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="{$sheetName}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>
XML;
    }

    protected function workbookRelationshipsXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
XML;
    }

    protected function stylesXml(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1">
    <font>
      <sz val="11"/>
      <name val="Calibri"/>
    </font>
  </fonts>
  <fills count="1">
    <fill>
      <patternFill patternType="none"/>
    </fill>
  </fills>
  <borders count="1">
    <border>
      <left/><right/><top/><bottom/><diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>
XML;
    }

    protected function appPropertiesXml(string $sheetName): string
    {
        $sheetName = $this->xmlEscape($sheetName);

        return <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Khivo Gaming Hub</Application>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>1</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="1" baseType="lpstr">
      <vt:lpstr>{$sheetName}</vt:lpstr>
    </vt:vector>
  </TitlesOfParts>
</Properties>
XML;
    }

    protected function corePropertiesXml(): string
    {
        $timestamp = now()->utc()->format('Y-m-d\TH:i:s\Z');

        return <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Khivo Gaming Hub</dc:creator>
  <cp:lastModifiedBy>Khivo Gaming Hub</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{$timestamp}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{$timestamp}</dcterms:modified>
</cp:coreProperties>
XML;
    }

    protected function worksheetXml(array $rows): string
    {
        $lastColumn = $this->columnLetter(max(1, max(array_map(fn (array $row) => count($row), $rows ?: [[]]))));
        $lastRow = max(1, count($rows));
        $xmlRows = '';

        foreach ($rows as $rowIndex => $row) {
            $xmlRows .= '<row r="'.($rowIndex + 1).'">';

            foreach (array_values($row) as $columnIndex => $value) {
                $cellReference = $this->columnLetter($columnIndex + 1).($rowIndex + 1);
                $xmlRows .= $this->worksheetCellXml($cellReference, $value);
            }

            $xmlRows .= '</row>';
        }

        return <<<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:{$lastColumn}{$lastRow}"/>
  <sheetData>{$xmlRows}</sheetData>
</worksheet>
XML;
    }

    protected function worksheetCellXml(string $reference, mixed $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        if (is_bool($value)) {
            $value = $value ? 1 : 0;
        }

        if (is_int($value) || is_float($value)) {
            return '<c r="'.$reference.'"><v>'.$value.'</v></c>';
        }

        return '<c r="'.$reference.'" t="inlineStr"><is><t>'.$this->xmlEscape((string) $value).'</t></is></c>';
    }

    protected function columnLetter(int $index): string
    {
        $letter = '';

        while ($index > 0) {
            $index--;
            $letter = chr(65 + ($index % 26)).$letter;
            $index = intdiv($index, 26);
        }

        return $letter;
    }

    protected function xmlEscape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }
}
