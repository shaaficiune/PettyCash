import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { 
  CreateDepartmentDto, CreateProjectDto, UpdateDepartmentBudgetDto, UpdateDepartmentDto,
  CreateRegionDto, UpdateRegionDto, CreateBudgetHeadDto, UpdateBudgetHeadDto 
} from './dto/company.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyIsolationGuard } from '../auth/company-isolation.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleName } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Companies, Departments, Projects, Regions & Budget Heads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyIsolationGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all companies (Admin/Accountant only)' })
  @UseGuards(RolesGuard)
  @Roles(RoleName.SUPER_ADMIN, RoleName.ACCOUNTANT)
  async getCompanies() {
    return this.companiesService.findAllCompanies();
  }

  @Get('departments')
  @ApiOperation({ summary: 'Get departments list, automatically filtered for Employees' })
  async getDepartments(@Request() req, @Query('companyId') companyId?: string) {
    const targetCompanyId = req.user.role === RoleName.EMPLOYEE ? req.user.companyId : companyId;
    return this.companiesService.findDepartments(targetCompanyId);
  }

  @Get('departments/:id/budget-stats')
  @ApiOperation({ summary: 'Get department monthly budget statistics' })
  async getDepartmentBudgetStats(@Param('id') id: string) {
    return this.companiesService.getDepartmentBudgetStats(id);
  }

  @Patch('departments/:id/budget')
  @ApiOperation({ summary: 'Update department monthly budget (Admin or Accountant only)' })
  @UseGuards(RolesGuard)
  @Roles(RoleName.SUPER_ADMIN, RoleName.ACCOUNTANT)
  async updateDepartmentBudget(@Param('id') id: string, @Body() dto: UpdateDepartmentBudgetDto) {
    return this.companiesService.updateDepartmentBudget(id, dto.monthlyBudget);
  }

  @Patch('departments/:id')
  @ApiOperation({ summary: 'Update department details (Admin or Accountant only)' })
  @UseGuards(RolesGuard)
  @Roles(RoleName.SUPER_ADMIN, RoleName.ACCOUNTANT)
  async updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.companiesService.updateDepartment(id, dto);
  }

  @Delete('departments/:id')
  @ApiOperation({ summary: 'Delete department (Super Admin or Accountant only)' })
  @UseGuards(RolesGuard)
  @Roles(RoleName.SUPER_ADMIN, RoleName.ACCOUNTANT)
  async deleteDepartment(@Param('id') id: string) {
    return this.companiesService.deleteDepartment(id);
  }

  @Get('projects')
  @ApiOperation({ summary: 'Get active projects list, automatically filtered for Employees' })
  async getProjects(@Request() req, @Query('companyId') companyId?: string) {
    const targetCompanyId = req.user.role === RoleName.EMPLOYEE ? req.user.companyId : companyId;
    return this.companiesService.findProjects(targetCompanyId);
  }

  @Post('departments')
  @ApiOperation({ summary: 'Create department (Super Admin or Accountant)' })
  @UseGuards(RolesGuard)
  @Roles(RoleName.SUPER_ADMIN, RoleName.ACCOUNTANT)
  async createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.companiesService.createDepartment(dto);
  }

  @Post('projects')
  @ApiOperation({ summary: 'Create project (Super Admin or Accountant)' })
  @UseGuards(RolesGuard)
  @Roles(RoleName.SUPER_ADMIN, RoleName.ACCOUNTANT)
  async createProject(@Body() dto: CreateProjectDto) {
    return this.companiesService.createProject(dto);
  }

  // --- REGIONS ROUTES ---
  @Get('regions')
  @ApiOperation({ summary: 'Get regions list' })
  async getRegions(@Request() req, @Query('companyId') companyId?: string) {
    const targetCompanyId = req.user.role === RoleName.EMPLOYEE ? req.user.companyId : companyId;
    return this.companiesService.findRegions(targetCompanyId);
  }

  @Post('regions')
  @ApiOperation({ summary: 'Create region (Super Admin or Accountant)' })
  @UseGuards(RolesGuard)
  @Roles(RoleName.SUPER_ADMIN, RoleName.ACCOUNTANT)
  async createRegion(@Body() dto: CreateRegionDto) {
    return this.companiesService.createRegion(dto);
  }

  @Get('regions/:id/budget-stats')
  @ApiOperation({ summary: 'Get region monthly budget statistics' })
  async getRegionBudgetStats(@Param('id') id: string) {
    return this.companiesService.getRegionBudgetStats(id);
  }

  @Patch('regions/:id')
  @ApiOperation({ summary: 'Update region (Super Admin or Accountant)' })
  @UseGuards(RolesGuard)
  @Roles(RoleName.SUPER_ADMIN, RoleName.ACCOUNTANT)
  async updateRegion(@Param('id') id: string, @Body() dto: UpdateRegionDto) {
    return this.companiesService.updateRegion(id, dto);
  }

  @Delete('regions/:id')
  @ApiOperation({ summary: 'Delete region (Super Admin or Accountant)' })
  @UseGuards(RolesGuard)
  @Roles(RoleName.SUPER_ADMIN, RoleName.ACCOUNTANT)
  async deleteRegion(@Param('id') id: string) {
    return this.companiesService.deleteRegion(id);
  }

  // --- BUDGET HEADS ROUTES ---
  @Get('budget-heads')
  @ApiOperation({ summary: 'Get budget heads list' })
  async getBudgetHeads(@Request() req, @Query('companyId') companyId?: string) {
    const targetCompanyId = req.user.role === RoleName.EMPLOYEE ? req.user.companyId : companyId;
    return this.companiesService.findBudgetHeads(targetCompanyId);
  }

  @Post('budget-heads')
  @ApiOperation({ summary: 'Create budget head (Super Admin or Accountant)' })
  @UseGuards(RolesGuard)
  @Roles(RoleName.SUPER_ADMIN, RoleName.ACCOUNTANT)
  async createBudgetHead(@Body() dto: CreateBudgetHeadDto) {
    return this.companiesService.createBudgetHead(dto);
  }

  @Patch('budget-heads/:id')
  @ApiOperation({ summary: 'Update budget head (Super Admin or Accountant)' })
  @UseGuards(RolesGuard)
  @Roles(RoleName.SUPER_ADMIN, RoleName.ACCOUNTANT)
  async updateBudgetHead(@Param('id') id: string, @Body() dto: UpdateBudgetHeadDto) {
    return this.companiesService.updateBudgetHead(id, dto);
  }

  @Delete('budget-heads/:id')
  @ApiOperation({ summary: 'Delete budget head (Super Admin or Accountant)' })
  @UseGuards(RolesGuard)
  @Roles(RoleName.SUPER_ADMIN, RoleName.ACCOUNTANT)
  async deleteBudgetHead(@Param('id') id: string) {
    return this.companiesService.deleteBudgetHead(id);
  }
}
