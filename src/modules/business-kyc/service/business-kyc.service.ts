import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BusinessInformation } from '../entity/business-information.entity';
import { Repository } from 'typeorm';
import { BusinessDocuments } from '../entity/business-documents.entity';
import { BusinessRepresentatives } from '../entity/business-reps.entity';
import {
  BusinessDocumentsDto,
  BusinessRepresentativesDto,
  SubmitBusinessInfoDto,
} from '../dto/business-kyc.dto';
import { RequestScope } from 'src/shared/business-scope';
import { BusinessService } from 'src/modules/businesses/service/business.service';

@Injectable()
export class BusinessKycService {
  constructor(
    @InjectRepository(BusinessInformation)
    private readonly businessInfoRepo: Repository<BusinessInformation>,

    @InjectRepository(BusinessDocuments)
    private readonly businessDocuments: Repository<BusinessDocuments>,

    @InjectRepository(BusinessRepresentatives)
    private readonly businessRepresentatives: Repository<BusinessRepresentatives>,

    private readonly businessService: BusinessService,
  ) {}
  private readonly logger = new Logger(BusinessKycService.name);

  async addBusinessInformation(
    payload: SubmitBusinessInfoDto,
    scope: RequestScope,
  ) {
    try {
      const alreadyReg = await this.businessInfoRepo.findOne({
        where: {
          regNumber: payload.registrationNumber.trim(),
        },
      });
      if (alreadyReg) {
        throw new BadRequestException(
          `Business with the ${payload.registrationNumber} already exist`,
        );
      }
      await this.businessInfoRepo.upsert(
        {
          businessId: scope.businessId,
          regNumber: payload.registrationNumber.trim(),
          businessEmail: payload.businessEmailAddress.trim(),
          city: payload.city.trim(),
          businessType: payload.businessType,
          addressOne: payload.addressOne.trim(),
          addressTwo: payload.addressTwo,
        },
        {
          conflictPaths: ['businessId'],
        },
      );
      await this.moveBusinessKycToReview(scope.businessId);
      return { message: 'Information successfully added' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async addBusinessRepresentatives(
    payload: BusinessRepresentativesDto,
    scope: RequestScope,
  ) {
    try {
      if (payload.representatives.length == 0) {
        throw new BadRequestException(
          'At least one representative must be present',
        );
      }
      const emails = payload.representatives.map((rep) => rep.email);
      const duplicateRep = await this.businessRepresentatives
        .createQueryBuilder('info')
        .where('LOWER(info.email) IN (:...emails)', {
          emails: emails.map((email) => email.toLowerCase()),
        })
        .andWhere('info.businessId = :businessId', {
          businessId: scope.businessId,
        })
        .getOne();
      if (duplicateRep) {
        throw new BadRequestException(
          `${duplicateRep.lastName} ${duplicateRep.firstName} already exist as representatives`,
        );
      }
      await this.repBulkInssert(payload, scope);
      await this.moveBusinessKycToReview(scope.businessId);
      return { message: 'Representatives successfully added' };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  async addBusinessDocuments(
    payload: BusinessDocumentsDto,
    scope: RequestScope,
  ) {
    const requiredDoc: Set<string> = new Set<string>('CAC');
    try {
      if (payload.documents.length == 0) {
        throw new BadRequestException(
          'At least one documents must be present must be present',
        );
      }
      for (const doc of requiredDoc) {
        if (!requiredDoc.has(doc)) {
          throw new BadRequestException(
            `${doc} is a required documents to proceed`,
          );
        }
      }
      const docNames = payload.documents.map((rep) => rep.documentName);
      const duplicateRep = await this.businessDocuments
        .createQueryBuilder('doc')
        .where('LOWER(doc.documentName) IN (:...documentName)', {
          documentName: docNames.map((name) => name.toLowerCase()),
        })
        .andWhere('doc.businessId = :businessId', {
          businessId: scope.businessId,
        })
        .getOne();
      if (duplicateRep) {
        throw new BadRequestException(
          `${duplicateRep.documentName}} already exist as document`,
        );
      }
      await this.documentBulkUpsert(payload, scope);
      await this.moveBusinessKycToReview(scope.businessId);
      return { message: 'Business documents successfully added' };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  private async repBulkInssert(
    payload: BusinessRepresentativesDto,
    scope: RequestScope,
  ) {
    await this.businessRepresentatives.insert(
      payload.representatives.map((rep) => ({
        businessId: scope.businessId,
        lastName: rep.firstName,
        email: rep.email,
        firstName: rep.lastName,
        role: rep.role,
        isPrimaryContact: rep.isPrimaryContact,
        identificationType: rep.identityType,
        identificationNumber: rep.idNumber,
        phoneNumber: rep.phoneNumber,
        identificationDocument: rep.documentKey,
      })),
    );
  }

  private async documentBulkUpsert(
    payload: BusinessDocumentsDto,
    scope: RequestScope,
  ) {
    await this.businessDocuments.upsert(
      payload.documents.map((doc) => ({
        file: doc.fileKey,
        businessId: scope.businessId,
        documentName: doc.documentName?.trim(),
      })),
      {
        conflictPaths: ['businessId', 'documentName'],
      },
    );
  }

  private async moveBusinessKycToReview(businessId: string) {
    const [info, doc, rep] = await Promise.all([
      this.businessInfoRepo.findOne({
        where: { businessId },
      }),
      this.businessDocuments.findOne({
        where: { businessId },
      }),
      this.businessRepresentatives.findOne({
        where: { businessId },
      }),
    ]);
    if (info && doc && rep) {
      await this.businessService.moveBusinessKycToReview(businessId);
    }
  }
}
