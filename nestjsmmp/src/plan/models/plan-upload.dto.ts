import { Type } from 'class-transformer';
import { ValidateNested,IsString, IsOptional, IsArray, ArrayMinSize, IsInt } from "class-validator";

// 鍛造用（複数行）
export class ForgingRowDto {
  @IsString()
  @IsOptional() // 空文字を許容するなら optional に
  equipmentName?: string;       // フロントでは '' を送っている → string でOK

  @IsOptional()
  @IsString()
  cdValue?: string | null;      // null 許容なら optional + union で運用（実運用では null は DTO上 string | null として扱うか、string | undefined に寄せる）

  @IsArray()
  @ArrayMinSize(1)
  valuesKtoAO!: number[][];     // ★ 2次元（1行分の系列を配列で包んだ形）
}

export class ForgingUploadDto {
  @IsString()
  category!: 'forging';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ForgingRowDto)
  rows!: ForgingRowDto[];
}

// 切削用
export class MachingRowDto {
  @IsInt()
  factoryDivision?: number;       // フロントでは '' を送っている → string でOK

  @IsString()
  A?: string | null;      // null 許容なら optional + union で運用（実運用では null は DTO上 string | null として扱うか、string | undefined に寄せる）

  @IsInt()
  E!: number;     // ★ 2次元（1行分の系列を配列で包んだ形）
}

export class MachiningUploadDto {
  @IsString()
  category!: 'machining';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MachingRowDto)
  rows!: MachingRowDto[];
}