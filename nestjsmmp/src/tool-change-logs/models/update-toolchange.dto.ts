import { IsInt, Min, Max } from "class-validator";

export class UpdateLineNamesDto {
    @IsInt()
    @Min(1)
    @Max(6)
    factory!: number
}