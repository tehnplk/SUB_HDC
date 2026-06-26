/*
Navicat MySQL Data Transfer

Source Server         : localhost_3306
Source Server Version : 50505
Source Host           : localhost:3306
Source Database       : sub_hdc

Target Server Type    : MYSQL
Target Server Version : 50505
File Encoding         : 65001

Date: 2026-06-26 11:15:08
*/

SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------
-- Table structure for accident
-- ----------------------------
DROP TABLE IF EXISTS `accident`;
CREATE TABLE `accident` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `datetime_serv` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `datetime_ae` varchar(255) NOT NULL DEFAULT '',
  `aetype` varchar(255) NOT NULL DEFAULT '',
  `aeplace` varchar(255) NOT NULL DEFAULT '',
  `typein_ae` varchar(255) NOT NULL DEFAULT '',
  `traffic` varchar(255) NOT NULL DEFAULT '',
  `vehicle` varchar(255) NOT NULL DEFAULT '',
  `alcohol` varchar(255) NOT NULL DEFAULT '',
  `nacrotic_drug` varchar(255) NOT NULL DEFAULT '',
  `belt` varchar(255) NOT NULL DEFAULT '',
  `helmet` varchar(255) NOT NULL DEFAULT '',
  `airway` varchar(255) NOT NULL DEFAULT '',
  `stopbleed` varchar(255) NOT NULL DEFAULT '',
  `splint` varchar(255) NOT NULL DEFAULT '',
  `fluid` varchar(255) NOT NULL DEFAULT '',
  `urgency` varchar(255) NOT NULL DEFAULT '',
  `coma_eye` varchar(255) NOT NULL DEFAULT '',
  `coma_speak` varchar(255) NOT NULL DEFAULT '',
  `coma_movement` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`seq`,`datetime_serv`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of accident
-- ----------------------------

-- ----------------------------
-- Table structure for address
-- ----------------------------
DROP TABLE IF EXISTS `address`;
CREATE TABLE `address` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `addresstype` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `house_id` varchar(255) NOT NULL DEFAULT '',
  `housetype` varchar(255) NOT NULL DEFAULT '',
  `roomno` varchar(255) NOT NULL DEFAULT '',
  `condo` varchar(255) NOT NULL DEFAULT '',
  `houseno` varchar(1000) NOT NULL DEFAULT '',
  `soisub` varchar(255) NOT NULL DEFAULT '',
  `soimain` varchar(255) NOT NULL DEFAULT '',
  `road` varchar(255) NOT NULL DEFAULT '',
  `villaname` varchar(255) NOT NULL DEFAULT '',
  `village` varchar(255) NOT NULL DEFAULT '',
  `tambon` varchar(255) NOT NULL DEFAULT '',
  `ampur` varchar(255) NOT NULL DEFAULT '',
  `changwat` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(1000) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`addresstype`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of address
-- ----------------------------

-- ----------------------------
-- Table structure for admission
-- ----------------------------
DROP TABLE IF EXISTS `admission`;
CREATE TABLE `admission` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) NOT NULL DEFAULT '',
  `an` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `datetime_admit` varchar(255) NOT NULL DEFAULT '',
  `wardadmit` varchar(255) NOT NULL DEFAULT '',
  `instype` varchar(255) NOT NULL DEFAULT '',
  `typein` varchar(255) NOT NULL DEFAULT '',
  `referinhosp` varchar(255) NOT NULL DEFAULT '',
  `causein` varchar(255) NOT NULL DEFAULT '',
  `admitweight` varchar(255) NOT NULL DEFAULT '',
  `admitheight` varchar(255) NOT NULL DEFAULT '',
  `datetime_disch` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `warddisch` varchar(255) NOT NULL DEFAULT '',
  `dischstatus` varchar(255) NOT NULL DEFAULT '',
  `dischtype` varchar(255) NOT NULL DEFAULT '',
  `referouthosp` varchar(255) NOT NULL DEFAULT '',
  `causeout` varchar(255) NOT NULL DEFAULT '',
  `cost` varchar(255) NOT NULL DEFAULT '',
  `price` varchar(255) NOT NULL DEFAULT '',
  `payprice` varchar(255) NOT NULL DEFAULT '',
  `actualpay` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `drg` varchar(255) NOT NULL DEFAULT '',
  `rw` varchar(255) NOT NULL DEFAULT '',
  `adjrw` varchar(255) NOT NULL DEFAULT '',
  `error` varchar(255) NOT NULL DEFAULT '',
  `warning` varchar(255) NOT NULL DEFAULT '',
  `actlos` varchar(255) NOT NULL DEFAULT '',
  `grouper_version` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`an`,`datetime_disch`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of admission
-- ----------------------------

-- ----------------------------
-- Table structure for anc
-- ----------------------------
DROP TABLE IF EXISTS `anc`;
CREATE TABLE `anc` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) NOT NULL DEFAULT '',
  `date_serv` varchar(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `gravida` varchar(255) NOT NULL DEFAULT '',
  `ancno` varchar(255) NOT NULL DEFAULT '',
  `ga` varchar(255) NOT NULL DEFAULT '',
  `ancresult` varchar(255) NOT NULL DEFAULT '',
  `ancplace` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `weight` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`date_serv`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of anc
-- ----------------------------

-- ----------------------------
-- Table structure for appointment
-- ----------------------------
DROP TABLE IF EXISTS `appointment`;
CREATE TABLE `appointment` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `an` varchar(255) NOT NULL DEFAULT '',
  `seq` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `date_serv` varchar(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `clinic` varchar(255) NOT NULL DEFAULT '',
  `apdate` varchar(255) NOT NULL DEFAULT '',
  `aptype` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `apdiag` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`seq`,`date_serv`,`aptype`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of appointment
-- ----------------------------

-- ----------------------------
-- Table structure for card
-- ----------------------------
DROP TABLE IF EXISTS `card`;
CREATE TABLE `card` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `instype_old` varchar(255) NOT NULL DEFAULT '',
  `instype_new` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `insid` varchar(255) NOT NULL DEFAULT '',
  `startdate` varchar(255) NOT NULL DEFAULT '',
  `expiredate` varchar(255) NOT NULL DEFAULT '',
  `main` varchar(255) NOT NULL DEFAULT '',
  `sub` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`instype_new`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of card
-- ----------------------------

-- ----------------------------
-- Table structure for care_refer
-- ----------------------------
DROP TABLE IF EXISTS `care_refer`;
CREATE TABLE `care_refer` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid_province` varchar(255) NOT NULL DEFAULT '',
  `caretype` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`referid`,`caretype`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of care_refer
-- ----------------------------

-- ----------------------------
-- Table structure for charge_ipd
-- ----------------------------
DROP TABLE IF EXISTS `charge_ipd`;
CREATE TABLE `charge_ipd` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `an` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `datetime_admit` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `wardstay` varchar(255) NOT NULL DEFAULT '',
  `chargeitem` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `chargelist` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `quantity` varchar(255) NOT NULL DEFAULT '',
  `instype` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `cost` varchar(255) NOT NULL DEFAULT '',
  `price` varchar(255) NOT NULL DEFAULT '',
  `payprice` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`an`,`datetime_admit`,`chargeitem`,`chargelist`,`instype`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of charge_ipd
-- ----------------------------

-- ----------------------------
-- Table structure for charge_opd
-- ----------------------------
DROP TABLE IF EXISTS `charge_opd`;
CREATE TABLE `charge_opd` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `date_serv` varchar(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `clinic` varchar(255) NOT NULL DEFAULT '',
  `chargeitem` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `chargelist` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `quantity` varchar(255) NOT NULL DEFAULT '',
  `instype` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `cost` varchar(255) NOT NULL DEFAULT '',
  `price` varchar(255) NOT NULL DEFAULT '',
  `payprice` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`seq`,`date_serv`,`chargeitem`,`chargelist`,`instype`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of charge_opd
-- ----------------------------

-- ----------------------------
-- Table structure for chronic
-- ----------------------------
DROP TABLE IF EXISTS `chronic`;
CREATE TABLE `chronic` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `date_diag` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `chronic` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `hosp_dx` varchar(255) NOT NULL DEFAULT '',
  `hosp_rx` varchar(255) NOT NULL DEFAULT '',
  `date_disch` varchar(255) NOT NULL DEFAULT '',
  `typedisch` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`date_diag`,`chronic`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of chronic
-- ----------------------------

-- ----------------------------
-- Table structure for chronicfu
-- ----------------------------
DROP TABLE IF EXISTS `chronicfu`;
CREATE TABLE `chronicfu` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) NOT NULL DEFAULT '',
  `date_serv` varchar(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `weight` varchar(255) NOT NULL DEFAULT '',
  `height` varchar(255) NOT NULL DEFAULT '',
  `waist_cm` varchar(255) NOT NULL DEFAULT '',
  `sbp` varchar(255) NOT NULL DEFAULT '',
  `dbp` varchar(255) NOT NULL DEFAULT '',
  `foot` varchar(255) NOT NULL DEFAULT '',
  `retina` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `chronicfuplace` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`date_serv`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of chronicfu
-- ----------------------------

-- ----------------------------
-- Table structure for clinical_refer
-- ----------------------------
DROP TABLE IF EXISTS `clinical_refer`;
CREATE TABLE `clinical_refer` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid_province` varchar(255) NOT NULL DEFAULT '',
  `datetime_assess` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `clinicalcode` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `clinicalname` varchar(255) NOT NULL DEFAULT '',
  `clinicalvalue` varchar(255) NOT NULL DEFAULT '',
  `clinicalresult` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`referid`,`datetime_assess`,`clinicalcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of clinical_refer
-- ----------------------------

-- ----------------------------
-- Table structure for community_activity
-- ----------------------------
DROP TABLE IF EXISTS `community_activity`;
CREATE TABLE `community_activity` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `vid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `date_start` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `date_finish` varchar(255) NOT NULL DEFAULT '',
  `comactivity` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`vid`,`date_start`,`comactivity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of community_activity
-- ----------------------------

-- ----------------------------
-- Table structure for community_service
-- ----------------------------
DROP TABLE IF EXISTS `community_service`;
CREATE TABLE `community_service` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `date_serv` varchar(8) NOT NULL DEFAULT '',
  `comservice` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`seq`,`comservice`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of community_service
-- ----------------------------

-- ----------------------------
-- Table structure for c_file
-- ----------------------------
DROP TABLE IF EXISTS `c_file`;
CREATE TABLE `c_file` (
  `file_name` varchar(255) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `note` varchar(255) DEFAULT 'NULL',
  PRIMARY KEY (`file_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Records of c_file
-- ----------------------------
INSERT INTO `c_file` VALUES ('accident', null, null);
INSERT INTO `c_file` VALUES ('address', null, null);
INSERT INTO `c_file` VALUES ('admission', null, null);
INSERT INTO `c_file` VALUES ('anc', null, null);
INSERT INTO `c_file` VALUES ('appointment', null, null);
INSERT INTO `c_file` VALUES ('card', null, null);
INSERT INTO `c_file` VALUES ('care_refer', null, null);
INSERT INTO `c_file` VALUES ('charge_ipd', null, null);
INSERT INTO `c_file` VALUES ('charge_opd', null, null);
INSERT INTO `c_file` VALUES ('chronic', null, null);
INSERT INTO `c_file` VALUES ('chronicfu', null, null);
INSERT INTO `c_file` VALUES ('clinical_refer', null, null);
INSERT INTO `c_file` VALUES ('community_activity', null, null);
INSERT INTO `c_file` VALUES ('community_service', null, null);
INSERT INTO `c_file` VALUES ('data_correct', null, null);
INSERT INTO `c_file` VALUES ('death', null, null);
INSERT INTO `c_file` VALUES ('dental', null, null);
INSERT INTO `c_file` VALUES ('diagnosis_ipd', null, null);
INSERT INTO `c_file` VALUES ('diagnosis_opd', null, null);
INSERT INTO `c_file` VALUES ('disability', null, null);
INSERT INTO `c_file` VALUES ('drugallergy', null, null);
INSERT INTO `c_file` VALUES ('drug_ipd', null, null);
INSERT INTO `c_file` VALUES ('drug_opd', null, null);
INSERT INTO `c_file` VALUES ('drug_refer', null, null);
INSERT INTO `c_file` VALUES ('epi', null, null);
INSERT INTO `c_file` VALUES ('fp', null, null);
INSERT INTO `c_file` VALUES ('functional', null, null);
INSERT INTO `c_file` VALUES ('home', null, null);
INSERT INTO `c_file` VALUES ('icf', null, null);
INSERT INTO `c_file` VALUES ('investigation_refer', null, null);
INSERT INTO `c_file` VALUES ('labfu', null, null);
INSERT INTO `c_file` VALUES ('labor', null, null);
INSERT INTO `c_file` VALUES ('ncdscreen', null, null);
INSERT INTO `c_file` VALUES ('newborn', null, null);
INSERT INTO `c_file` VALUES ('newborncare', null, null);
INSERT INTO `c_file` VALUES ('nutrition', null, null);
INSERT INTO `c_file` VALUES ('person', null, null);
INSERT INTO `c_file` VALUES ('policy', null, null);
INSERT INTO `c_file` VALUES ('postnatal', null, null);
INSERT INTO `c_file` VALUES ('prenatal', null, null);
INSERT INTO `c_file` VALUES ('procedure_ipd', null, null);
INSERT INTO `c_file` VALUES ('procedure_opd', null, null);
INSERT INTO `c_file` VALUES ('procedure_refer', null, null);
INSERT INTO `c_file` VALUES ('provider', null, null);
INSERT INTO `c_file` VALUES ('refer_history', null, null);
INSERT INTO `c_file` VALUES ('refer_result', null, null);
INSERT INTO `c_file` VALUES ('rehabilitation', null, null);
INSERT INTO `c_file` VALUES ('service', null, null);
INSERT INTO `c_file` VALUES ('specialpp', null, null);
INSERT INTO `c_file` VALUES ('surveillance', null, null);
INSERT INTO `c_file` VALUES ('village', null, null);
INSERT INTO `c_file` VALUES ('women', null, null);

-- ----------------------------
-- Table structure for data_correct
-- ----------------------------
DROP TABLE IF EXISTS `data_correct`;
CREATE TABLE `data_correct` (
  `hospcode` varchar(5) NOT NULL DEFAULT '',
  `tablename` varchar(255) NOT NULL DEFAULT '',
  `data_correct` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`d_update`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of data_correct
-- ----------------------------

-- ----------------------------
-- Table structure for death
-- ----------------------------
DROP TABLE IF EXISTS `death`;
CREATE TABLE `death` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `hospdeath` varchar(255) NOT NULL DEFAULT '',
  `an` varchar(255) NOT NULL DEFAULT '',
  `seq` varchar(255) NOT NULL DEFAULT '',
  `ddeath` varchar(255) NOT NULL DEFAULT '',
  `cdeath_a` varchar(255) NOT NULL DEFAULT '',
  `cdeath_b` varchar(255) NOT NULL DEFAULT '',
  `cdeath_c` varchar(255) NOT NULL DEFAULT '',
  `cdeath_d` varchar(255) NOT NULL DEFAULT '',
  `odisease` varchar(255) NOT NULL DEFAULT '',
  `cdeath` varchar(255) NOT NULL DEFAULT '',
  `pregdeath` varchar(255) NOT NULL DEFAULT '',
  `pdeath` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of death
-- ----------------------------

-- ----------------------------
-- Table structure for dental
-- ----------------------------
DROP TABLE IF EXISTS `dental`;
CREATE TABLE `dental` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `date_serv` varchar(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `denttype` varchar(255) NOT NULL DEFAULT '',
  `servplace` varchar(255) NOT NULL DEFAULT '',
  `pteeth` varchar(255) NOT NULL DEFAULT '',
  `pcaries` varchar(255) NOT NULL DEFAULT '',
  `pfilling` varchar(255) NOT NULL DEFAULT '',
  `pextract` varchar(255) NOT NULL DEFAULT '',
  `dteeth` varchar(255) NOT NULL DEFAULT '',
  `dcaries` varchar(255) NOT NULL DEFAULT '',
  `dfilling` varchar(255) NOT NULL DEFAULT '',
  `dextract` varchar(255) NOT NULL DEFAULT '',
  `need_fluoride` varchar(255) NOT NULL DEFAULT '',
  `need_scaling` varchar(255) NOT NULL DEFAULT '',
  `need_sealant` varchar(255) NOT NULL DEFAULT '',
  `need_pfilling` varchar(255) NOT NULL DEFAULT '',
  `need_dfilling` varchar(255) NOT NULL DEFAULT '',
  `need_pextract` varchar(255) NOT NULL DEFAULT '',
  `need_dextract` varchar(255) NOT NULL DEFAULT '',
  `nprosthesis` varchar(255) NOT NULL DEFAULT '',
  `permanent_permanent` varchar(255) NOT NULL DEFAULT '',
  `permanent_prosthesis` varchar(255) NOT NULL DEFAULT '',
  `prosthesis_prosthesis` varchar(255) NOT NULL DEFAULT '',
  `gum` varchar(255) NOT NULL DEFAULT '',
  `schooltype` varchar(255) NOT NULL DEFAULT '',
  `class` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`seq`,`date_serv`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of dental
-- ----------------------------

-- ----------------------------
-- Table structure for diagnosis_ipd
-- ----------------------------
DROP TABLE IF EXISTS `diagnosis_ipd`;
CREATE TABLE `diagnosis_ipd` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `an` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `datetime_admit` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `warddiag` varchar(255) NOT NULL DEFAULT '',
  `diagtype` varchar(255) NOT NULL DEFAULT '',
  `diagcode` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`an`,`datetime_admit`,`diagcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of diagnosis_ipd
-- ----------------------------

-- ----------------------------
-- Table structure for diagnosis_opd
-- ----------------------------
DROP TABLE IF EXISTS `diagnosis_opd`;
CREATE TABLE `diagnosis_opd` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `date_serv` varchar(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `diagtype` varchar(255) NOT NULL DEFAULT '',
  `diagcode` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `clinic` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`seq`,`date_serv`,`diagcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of diagnosis_opd
-- ----------------------------

-- ----------------------------
-- Table structure for disability
-- ----------------------------
DROP TABLE IF EXISTS `disability`;
CREATE TABLE `disability` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `disabid` varchar(255) NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `disabtype` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `disabcause` varchar(255) NOT NULL DEFAULT '',
  `diagcode` varchar(255) NOT NULL DEFAULT '',
  `date_detect` varchar(255) NOT NULL DEFAULT '',
  `date_disab` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`disabtype`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of disability
-- ----------------------------

-- ----------------------------
-- Table structure for drugallergy
-- ----------------------------
DROP TABLE IF EXISTS `drugallergy`;
CREATE TABLE `drugallergy` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `daterecord` varchar(255) NOT NULL DEFAULT '',
  `drugallergy` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `dname` varchar(255) NOT NULL DEFAULT '',
  `typedx` varchar(255) NOT NULL DEFAULT '',
  `alevel` varchar(255) NOT NULL DEFAULT '',
  `symptom` varchar(255) NOT NULL DEFAULT '',
  `informant` varchar(255) NOT NULL DEFAULT '',
  `informhosp` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`drugallergy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of drugallergy
-- ----------------------------

-- ----------------------------
-- Table structure for drug_ipd
-- ----------------------------
DROP TABLE IF EXISTS `drug_ipd`;
CREATE TABLE `drug_ipd` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `an` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `datetime_admit` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `wardstay` varchar(255) NOT NULL DEFAULT '',
  `typedrug` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `didstd` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `dname` varchar(255) NOT NULL DEFAULT '',
  `datestart` varchar(255) NOT NULL DEFAULT '',
  `datefinish` varchar(255) NOT NULL DEFAULT '',
  `amount` varchar(255) NOT NULL DEFAULT '',
  `unit` varchar(255) NOT NULL DEFAULT '',
  `unit_packing` varchar(255) NOT NULL DEFAULT '',
  `drugprice` varchar(255) NOT NULL DEFAULT '',
  `drugcost` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`an`,`datetime_admit`,`typedrug`,`didstd`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of drug_ipd
-- ----------------------------

-- ----------------------------
-- Table structure for drug_opd
-- ----------------------------
DROP TABLE IF EXISTS `drug_opd`;
CREATE TABLE `drug_opd` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `date_serv` varchar(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `clinic` varchar(255) NOT NULL DEFAULT '',
  `didstd` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `dname` varchar(255) NOT NULL DEFAULT '',
  `amount` varchar(255) NOT NULL DEFAULT '',
  `unit` varchar(255) NOT NULL DEFAULT '',
  `unit_packing` varchar(255) NOT NULL DEFAULT '',
  `drugprice` varchar(255) NOT NULL DEFAULT '',
  `drugcost` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`seq`,`date_serv`,`didstd`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of drug_opd
-- ----------------------------

-- ----------------------------
-- Table structure for drug_refer
-- ----------------------------
DROP TABLE IF EXISTS `drug_refer`;
CREATE TABLE `drug_refer` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid_province` varchar(255) NOT NULL DEFAULT '',
  `datetime_dstart` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `datetime_dfinish` varchar(255) NOT NULL DEFAULT '',
  `didstd` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `dname` varchar(255) NOT NULL DEFAULT '',
  `ddescription` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`referid`,`datetime_dstart`,`didstd`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of drug_refer
-- ----------------------------

-- ----------------------------
-- Table structure for epi
-- ----------------------------
DROP TABLE IF EXISTS `epi`;
CREATE TABLE `epi` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) NOT NULL DEFAULT '',
  `date_serv` varchar(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `vaccinetype` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `vaccineplace` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`date_serv`,`vaccinetype`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of epi
-- ----------------------------

-- ----------------------------
-- Table structure for fp
-- ----------------------------
DROP TABLE IF EXISTS `fp`;
CREATE TABLE `fp` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) NOT NULL DEFAULT '',
  `date_serv` varchar(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `fptype` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `fpplace` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`date_serv`,`fptype`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of fp
-- ----------------------------

-- ----------------------------
-- Table structure for functional
-- ----------------------------
DROP TABLE IF EXISTS `functional`;
CREATE TABLE `functional` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `date_serv` varchar(8) NOT NULL DEFAULT '',
  `functional_test` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `testresult` varchar(255) NOT NULL DEFAULT '',
  `dependent` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`seq`,`functional_test`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of functional
-- ----------------------------

-- ----------------------------
-- Table structure for home
-- ----------------------------
DROP TABLE IF EXISTS `home`;
CREATE TABLE `home` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `hid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `house_id` varchar(255) NOT NULL DEFAULT '',
  `housetype` varchar(255) NOT NULL DEFAULT '',
  `roomno` varchar(255) NOT NULL DEFAULT '',
  `condo` varchar(255) NOT NULL DEFAULT '',
  `house` varchar(255) NOT NULL DEFAULT '',
  `soisub` varchar(255) NOT NULL DEFAULT '',
  `soimain` varchar(255) NOT NULL DEFAULT '',
  `road` varchar(255) NOT NULL DEFAULT '',
  `villaname` varchar(255) NOT NULL DEFAULT '',
  `village` varchar(255) NOT NULL DEFAULT '',
  `tambon` varchar(255) NOT NULL DEFAULT '',
  `ampur` varchar(255) NOT NULL DEFAULT '',
  `changwat` varchar(255) NOT NULL DEFAULT '',
  `telephone` varchar(1000) NOT NULL DEFAULT '',
  `latitude` varchar(255) NOT NULL DEFAULT '',
  `longitude` varchar(255) NOT NULL DEFAULT '',
  `nfamily` varchar(255) NOT NULL DEFAULT '',
  `locatype` varchar(255) NOT NULL DEFAULT '',
  `vhvid` varchar(255) NOT NULL DEFAULT '',
  `headid` varchar(255) NOT NULL DEFAULT '',
  `toilet` varchar(255) NOT NULL DEFAULT '',
  `water` varchar(255) NOT NULL DEFAULT '',
  `watertype` varchar(255) NOT NULL DEFAULT '',
  `garbage` varchar(255) NOT NULL DEFAULT '',
  `housing` varchar(255) NOT NULL DEFAULT '',
  `durability` varchar(255) NOT NULL DEFAULT '',
  `cleanliness` varchar(255) NOT NULL DEFAULT '',
  `ventilation` varchar(255) NOT NULL DEFAULT '',
  `light` varchar(255) NOT NULL DEFAULT '',
  `watertm` varchar(255) NOT NULL DEFAULT '',
  `mfood` varchar(255) NOT NULL DEFAULT '',
  `bcontrol` varchar(255) NOT NULL DEFAULT '',
  `acontrol` varchar(255) NOT NULL DEFAULT '',
  `chemical` varchar(255) NOT NULL DEFAULT '',
  `outdate` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`hid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of home
-- ----------------------------

-- ----------------------------
-- Table structure for icf
-- ----------------------------
DROP TABLE IF EXISTS `icf`;
CREATE TABLE `icf` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `disabid` varchar(255) NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `date_serv` varchar(8) NOT NULL DEFAULT '',
  `icf` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `qualifier` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`seq`,`icf`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of icf
-- ----------------------------

-- ----------------------------
-- Table structure for investigation_refer
-- ----------------------------
DROP TABLE IF EXISTS `investigation_refer`;
CREATE TABLE `investigation_refer` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid_province` varchar(255) NOT NULL DEFAULT '',
  `datetime_invest` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `investcode` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `investname` varchar(255) NOT NULL DEFAULT '',
  `datetime_report` varchar(255) NOT NULL DEFAULT '',
  `investvalue` varchar(255) NOT NULL DEFAULT '',
  `investresult` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`referid`,`datetime_invest`,`investcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of investigation_refer
-- ----------------------------

-- ----------------------------
-- Table structure for labfu
-- ----------------------------
DROP TABLE IF EXISTS `labfu`;
CREATE TABLE `labfu` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) NOT NULL DEFAULT '',
  `date_serv` varchar(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `labtest` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `labresult` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `labplace` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`date_serv`,`labtest`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of labfu
-- ----------------------------

-- ----------------------------
-- Table structure for labor
-- ----------------------------
DROP TABLE IF EXISTS `labor`;
CREATE TABLE `labor` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `gravida` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `lmp` varchar(255) NOT NULL DEFAULT '',
  `edc` varchar(255) NOT NULL DEFAULT '',
  `bdate` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `bresult` varchar(255) NOT NULL DEFAULT '',
  `bplace` varchar(255) NOT NULL DEFAULT '',
  `bhosp` varchar(255) NOT NULL DEFAULT '',
  `btype` varchar(255) NOT NULL DEFAULT '',
  `bdoctor` varchar(255) NOT NULL DEFAULT '',
  `lborn` varchar(255) NOT NULL DEFAULT '',
  `sborn` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`gravida`,`bdate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of labor
-- ----------------------------

-- ----------------------------
-- Table structure for log_import_file
-- ----------------------------
DROP TABLE IF EXISTS `log_import_file`;
CREATE TABLE `log_import_file` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `file_name` varchar(255) NOT NULL DEFAULT '',
  `import_date_time` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Records of log_import_file
-- ----------------------------

-- ----------------------------
-- Table structure for ncdscreen
-- ----------------------------
DROP TABLE IF EXISTS `ncdscreen`;
CREATE TABLE `ncdscreen` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) NOT NULL DEFAULT '',
  `date_serv` varchar(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `servplace` varchar(255) NOT NULL DEFAULT '',
  `smoke` varchar(255) NOT NULL DEFAULT '',
  `alcohol` varchar(255) NOT NULL DEFAULT '',
  `dmfamily` varchar(255) NOT NULL DEFAULT '',
  `htfamily` varchar(255) NOT NULL DEFAULT '',
  `weight` varchar(255) NOT NULL DEFAULT '',
  `height` varchar(255) NOT NULL DEFAULT '',
  `waist_cm` varchar(255) NOT NULL DEFAULT '',
  `sbp_1` varchar(255) NOT NULL DEFAULT '',
  `dbp_1` varchar(255) NOT NULL DEFAULT '',
  `sbp_2` varchar(255) NOT NULL DEFAULT '',
  `dbp_2` varchar(255) NOT NULL DEFAULT '',
  `bslevel` varchar(255) NOT NULL DEFAULT '',
  `bstest` varchar(255) NOT NULL DEFAULT '',
  `screenplace` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`date_serv`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of ncdscreen
-- ----------------------------

-- ----------------------------
-- Table structure for newborn
-- ----------------------------
DROP TABLE IF EXISTS `newborn`;
CREATE TABLE `newborn` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `mpid` varchar(255) NOT NULL DEFAULT '',
  `gravida` varchar(255) NOT NULL DEFAULT '',
  `ga` varchar(255) NOT NULL DEFAULT '',
  `bdate` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `btime` varchar(255) NOT NULL DEFAULT '',
  `bplace` varchar(255) NOT NULL DEFAULT '',
  `bhosp` varchar(255) NOT NULL DEFAULT '',
  `birthno` varchar(255) NOT NULL DEFAULT '',
  `btype` varchar(255) NOT NULL DEFAULT '',
  `bdoctor` varchar(255) NOT NULL DEFAULT '',
  `bweight` varchar(255) NOT NULL DEFAULT '',
  `asphyxia` varchar(255) NOT NULL DEFAULT '',
  `vitk` varchar(255) NOT NULL DEFAULT '',
  `tsh` varchar(255) NOT NULL DEFAULT '',
  `tshresult` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `length` varchar(255) NOT NULL DEFAULT '',
  `headcircum` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`bdate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of newborn
-- ----------------------------

-- ----------------------------
-- Table structure for newborncare
-- ----------------------------
DROP TABLE IF EXISTS `newborncare`;
CREATE TABLE `newborncare` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) NOT NULL DEFAULT '',
  `bdate` varchar(255) NOT NULL DEFAULT '',
  `bcare` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `bcplace` varchar(255) NOT NULL DEFAULT '',
  `bcareresult` varchar(255) NOT NULL DEFAULT '',
  `food` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`bcare`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of newborncare
-- ----------------------------

-- ----------------------------
-- Table structure for nutrition
-- ----------------------------
DROP TABLE IF EXISTS `nutrition`;
CREATE TABLE `nutrition` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) NOT NULL DEFAULT '',
  `date_serv` varchar(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `nutritionplace` varchar(255) NOT NULL DEFAULT '',
  `weight` varchar(255) NOT NULL DEFAULT '',
  `height` varchar(255) NOT NULL DEFAULT '',
  `headcircum` varchar(255) NOT NULL DEFAULT '',
  `childdevelop` varchar(255) NOT NULL DEFAULT '',
  `food` varchar(255) NOT NULL DEFAULT '',
  `bottle` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`date_serv`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of nutrition
-- ----------------------------

-- ----------------------------
-- Table structure for person
-- ----------------------------
DROP TABLE IF EXISTS `person`;
CREATE TABLE `person` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `hid` varchar(255) NOT NULL DEFAULT '',
  `prename` varchar(255) NOT NULL DEFAULT '',
  `name` varchar(255) NOT NULL DEFAULT '',
  `lname` varchar(1000) NOT NULL DEFAULT '',
  `hn` varchar(255) NOT NULL DEFAULT '',
  `sex` varchar(255) NOT NULL DEFAULT '',
  `birth` varchar(255) NOT NULL DEFAULT '',
  `mstatus` varchar(255) NOT NULL DEFAULT '',
  `occupation_old` varchar(255) NOT NULL DEFAULT '',
  `occupation_new` varchar(255) NOT NULL DEFAULT '',
  `race` varchar(255) NOT NULL DEFAULT '',
  `nation` varchar(255) NOT NULL DEFAULT '',
  `religion` varchar(255) NOT NULL DEFAULT '',
  `education` varchar(255) NOT NULL DEFAULT '',
  `fstatus` varchar(255) NOT NULL DEFAULT '',
  `father` varchar(255) NOT NULL DEFAULT '',
  `mother` varchar(255) NOT NULL DEFAULT '',
  `couple` varchar(255) NOT NULL DEFAULT '',
  `vstatus` varchar(255) NOT NULL DEFAULT '',
  `movein` varchar(255) NOT NULL DEFAULT '',
  `discharge` varchar(255) NOT NULL DEFAULT '',
  `ddischarge` varchar(255) NOT NULL DEFAULT '',
  `abogroup` varchar(255) NOT NULL DEFAULT '',
  `rhgroup` varchar(255) NOT NULL DEFAULT '',
  `labor` varchar(255) NOT NULL DEFAULT '',
  `passport` varchar(255) NOT NULL DEFAULT '',
  `typearea` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `telephone` varchar(1000) NOT NULL DEFAULT '',
  `mobile` varchar(1000) NOT NULL DEFAULT '',
  `cid_aes` varchar(1000) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of person
-- ----------------------------

-- ----------------------------
-- Table structure for policy
-- ----------------------------
DROP TABLE IF EXISTS `policy`;
CREATE TABLE `policy` (
  `hospcode` varchar(5) NOT NULL DEFAULT '',
  `policy_id` varchar(255) NOT NULL DEFAULT '',
  `policy_year` varchar(255) NOT NULL DEFAULT '',
  `policy_data` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of policy
-- ----------------------------

-- ----------------------------
-- Table structure for postnatal
-- ----------------------------
DROP TABLE IF EXISTS `postnatal`;
CREATE TABLE `postnatal` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) NOT NULL DEFAULT '',
  `gravida` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `bdate` varchar(255) NOT NULL DEFAULT '',
  `ppcare` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `ppplace` varchar(255) NOT NULL DEFAULT '',
  `ppresult` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`gravida`,`ppcare`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of postnatal
-- ----------------------------

-- ----------------------------
-- Table structure for prenatal
-- ----------------------------
DROP TABLE IF EXISTS `prenatal`;
CREATE TABLE `prenatal` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `gravida` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `lmp` varchar(255) NOT NULL DEFAULT '',
  `edc` varchar(255) NOT NULL DEFAULT '',
  `vdrl_result` varchar(255) NOT NULL DEFAULT '',
  `hb_result` varchar(255) NOT NULL DEFAULT '',
  `hiv_result` varchar(255) NOT NULL DEFAULT '',
  `date_hct` varchar(255) NOT NULL DEFAULT '',
  `hct_result` varchar(255) NOT NULL DEFAULT '',
  `thalassemia` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `height` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`gravida`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of prenatal
-- ----------------------------

-- ----------------------------
-- Table structure for procedure_ipd
-- ----------------------------
DROP TABLE IF EXISTS `procedure_ipd`;
CREATE TABLE `procedure_ipd` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `an` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `datetime_admit` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `wardstay` varchar(255) NOT NULL DEFAULT '',
  `procedcode` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `timestart` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `timefinish` varchar(255) NOT NULL DEFAULT '',
  `serviceprice` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`an`,`datetime_admit`,`procedcode`,`timestart`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of procedure_ipd
-- ----------------------------

-- ----------------------------
-- Table structure for procedure_opd
-- ----------------------------
DROP TABLE IF EXISTS `procedure_opd`;
CREATE TABLE `procedure_opd` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `date_serv` varchar(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `clinic` varchar(255) NOT NULL DEFAULT '',
  `procedcode` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `serviceprice` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`seq`,`date_serv`,`procedcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of procedure_opd
-- ----------------------------

-- ----------------------------
-- Table structure for procedure_refer
-- ----------------------------
DROP TABLE IF EXISTS `procedure_refer`;
CREATE TABLE `procedure_refer` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid_province` varchar(255) NOT NULL DEFAULT '',
  `timestart` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `timefinish` varchar(255) NOT NULL DEFAULT '',
  `procedurename` varchar(255) NOT NULL DEFAULT '',
  `procedcode` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pdescription` varchar(255) NOT NULL DEFAULT '',
  `procedresult` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`referid`,`timestart`,`procedcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of procedure_refer
-- ----------------------------

-- ----------------------------
-- Table structure for provider
-- ----------------------------
DROP TABLE IF EXISTS `provider`;
CREATE TABLE `provider` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `provider` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `registerno` varchar(255) NOT NULL DEFAULT '',
  `council` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `prename` varchar(255) NOT NULL DEFAULT '',
  `name` varchar(255) NOT NULL DEFAULT '',
  `lname` varchar(1000) NOT NULL DEFAULT '',
  `sex` varchar(255) NOT NULL DEFAULT '',
  `birth` varchar(255) NOT NULL DEFAULT '',
  `providertype` varchar(255) NOT NULL DEFAULT '',
  `startdate` varchar(255) NOT NULL DEFAULT '',
  `outdate` varchar(255) NOT NULL DEFAULT '',
  `movefrom` varchar(255) NOT NULL DEFAULT '',
  `moveto` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(1000) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`provider`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of provider
-- ----------------------------

-- ----------------------------
-- Table structure for refer_history
-- ----------------------------
DROP TABLE IF EXISTS `refer_history`;
CREATE TABLE `refer_history` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid_province` varchar(255) NOT NULL DEFAULT '',
  `pid` varchar(255) NOT NULL DEFAULT '',
  `seq` varchar(255) NOT NULL DEFAULT '',
  `an` varchar(255) NOT NULL DEFAULT '',
  `referid_origin` varchar(255) NOT NULL DEFAULT '',
  `hospcode_origin` varchar(255) NOT NULL DEFAULT '',
  `datetime_serv` varchar(255) NOT NULL DEFAULT '',
  `datetime_admit` varchar(255) NOT NULL DEFAULT '',
  `datetime_refer` varchar(255) NOT NULL DEFAULT '',
  `clinic_refer` varchar(255) NOT NULL DEFAULT '',
  `hosp_destination` varchar(255) NOT NULL DEFAULT '',
  `chiefcomp` varchar(255) NOT NULL DEFAULT '',
  `physicalexam` varchar(255) NOT NULL DEFAULT '',
  `diagfirst` varchar(255) NOT NULL DEFAULT '',
  `diaglast` varchar(255) NOT NULL DEFAULT '',
  `pstatus` varchar(255) NOT NULL DEFAULT '',
  `ptype` varchar(255) NOT NULL DEFAULT '',
  `emergency` varchar(255) NOT NULL DEFAULT '',
  `ptypedis` varchar(255) NOT NULL DEFAULT '',
  `causeout` varchar(255) NOT NULL DEFAULT '',
  `request` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`referid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of refer_history
-- ----------------------------

-- ----------------------------
-- Table structure for refer_result
-- ----------------------------
DROP TABLE IF EXISTS `refer_result`;
CREATE TABLE `refer_result` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid_source` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid_province` varchar(255) NOT NULL DEFAULT '',
  `hosp_source` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `refer_result` varchar(255) NOT NULL DEFAULT '',
  `datetime_in` varchar(255) NOT NULL DEFAULT '',
  `pid_in` varchar(255) NOT NULL DEFAULT '',
  `an_in` varchar(255) NOT NULL DEFAULT '',
  `reason` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`referid_source`,`hosp_source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of refer_result
-- ----------------------------

-- ----------------------------
-- Table structure for rehabilitation
-- ----------------------------
DROP TABLE IF EXISTS `rehabilitation`;
CREATE TABLE `rehabilitation` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) NOT NULL DEFAULT '',
  `an` varchar(255) NOT NULL DEFAULT '',
  `date_admit` varchar(255) NOT NULL DEFAULT '',
  `date_serv` varchar(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `date_start` varchar(255) NOT NULL DEFAULT '',
  `date_finish` varchar(255) NOT NULL DEFAULT '',
  `rehabcode` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `at_device` varchar(255) NOT NULL DEFAULT '',
  `at_no` varchar(255) NOT NULL DEFAULT '',
  `rehabplace` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`date_serv`,`rehabcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of rehabilitation
-- ----------------------------

-- ----------------------------
-- Table structure for service
-- ----------------------------
DROP TABLE IF EXISTS `service`;
CREATE TABLE `service` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) NOT NULL DEFAULT '',
  `hn` varchar(255) NOT NULL DEFAULT '',
  `seq` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `date_serv` varchar(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `time_serv` varchar(255) NOT NULL DEFAULT '',
  `location` varchar(255) NOT NULL DEFAULT '',
  `intime` varchar(255) NOT NULL DEFAULT '',
  `instype` varchar(255) NOT NULL DEFAULT '',
  `insid` varchar(255) NOT NULL DEFAULT '',
  `main` varchar(255) NOT NULL DEFAULT '',
  `typein` varchar(255) NOT NULL DEFAULT '',
  `referinhosp` varchar(255) NOT NULL DEFAULT '',
  `causein` varchar(255) NOT NULL DEFAULT '',
  `chiefcomp` varchar(255) NOT NULL DEFAULT '',
  `servplace` varchar(255) NOT NULL DEFAULT '',
  `btemp` varchar(255) NOT NULL DEFAULT '',
  `sbp` varchar(255) NOT NULL DEFAULT '',
  `dbp` varchar(255) NOT NULL DEFAULT '',
  `pr` varchar(255) NOT NULL DEFAULT '',
  `rr` varchar(255) NOT NULL DEFAULT '',
  `typeout` varchar(255) NOT NULL DEFAULT '',
  `referouthosp` varchar(255) NOT NULL DEFAULT '',
  `causeout` varchar(255) NOT NULL DEFAULT '',
  `cost` varchar(255) NOT NULL DEFAULT '',
  `price` varchar(255) NOT NULL DEFAULT '',
  `payprice` varchar(255) NOT NULL DEFAULT '',
  `actualpay` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `hsub` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`seq`,`date_serv`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of service
-- ----------------------------

-- ----------------------------
-- Table structure for specialpp
-- ----------------------------
DROP TABLE IF EXISTS `specialpp`;
CREATE TABLE `specialpp` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) NOT NULL DEFAULT '',
  `date_serv` varchar(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `servplace` varchar(255) NOT NULL DEFAULT '',
  `ppspecial` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `ppsplace` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`date_serv`,`ppspecial`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of specialpp
-- ----------------------------

-- ----------------------------
-- Table structure for surveillance
-- ----------------------------
DROP TABLE IF EXISTS `surveillance`;
CREATE TABLE `surveillance` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `date_serv` varchar(8) NOT NULL DEFAULT '',
  `an` varchar(255) NOT NULL DEFAULT '',
  `datetime_admit` varchar(255) NOT NULL DEFAULT '',
  `syndrome` varchar(255) NOT NULL DEFAULT '',
  `diagcode` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `code506` varchar(255) NOT NULL DEFAULT '',
  `diagcodelast` varchar(255) NOT NULL DEFAULT '',
  `code506last` varchar(255) NOT NULL DEFAULT '',
  `illdate` varchar(255) NOT NULL DEFAULT '',
  `illhouse` varchar(255) NOT NULL DEFAULT '',
  `illvillage` varchar(255) NOT NULL DEFAULT '',
  `illtambon` varchar(255) NOT NULL DEFAULT '',
  `illampur` varchar(255) NOT NULL DEFAULT '',
  `illchangwat` varchar(255) NOT NULL DEFAULT '',
  `latitude` varchar(255) NOT NULL DEFAULT '',
  `longitude` varchar(255) NOT NULL DEFAULT '',
  `ptstatus` varchar(255) NOT NULL DEFAULT '',
  `date_death` varchar(255) NOT NULL DEFAULT '',
  `complication` varchar(255) NOT NULL DEFAULT '',
  `organism` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`seq`,`diagcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of surveillance
-- ----------------------------

-- ----------------------------
-- Table structure for village
-- ----------------------------
DROP TABLE IF EXISTS `village`;
CREATE TABLE `village` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `vid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `ntraditional` varchar(255) NOT NULL DEFAULT '',
  `nmonk` varchar(255) NOT NULL DEFAULT '',
  `nreligionleader` varchar(255) NOT NULL DEFAULT '',
  `nbroadcast` varchar(255) NOT NULL DEFAULT '',
  `nradio` varchar(255) NOT NULL DEFAULT '',
  `npchc` varchar(255) NOT NULL DEFAULT '',
  `nclinic` varchar(255) NOT NULL DEFAULT '',
  `ndrugstore` varchar(255) NOT NULL DEFAULT '',
  `nchildcenter` varchar(255) NOT NULL DEFAULT '',
  `npschool` varchar(255) NOT NULL DEFAULT '',
  `nsschool` varchar(255) NOT NULL DEFAULT '',
  `ntemple` varchar(255) NOT NULL DEFAULT '',
  `nreligiousplace` varchar(255) NOT NULL DEFAULT '',
  `nmarket` varchar(255) NOT NULL DEFAULT '',
  `nshop` varchar(255) NOT NULL DEFAULT '',
  `nfoodshop` varchar(255) NOT NULL DEFAULT '',
  `nstall` varchar(255) NOT NULL DEFAULT '',
  `nraintank` varchar(255) NOT NULL DEFAULT '',
  `nchickenfarm` varchar(255) NOT NULL DEFAULT '',
  `npigfarm` varchar(255) NOT NULL DEFAULT '',
  `wastewater` varchar(255) NOT NULL DEFAULT '',
  `garbage` varchar(255) NOT NULL DEFAULT '',
  `nfactory` varchar(255) NOT NULL DEFAULT '',
  `latitude` varchar(255) NOT NULL DEFAULT '',
  `longitude` varchar(255) NOT NULL DEFAULT '',
  `outdate` varchar(255) NOT NULL DEFAULT '',
  `numactually` varchar(255) NOT NULL DEFAULT '',
  `risktype` varchar(255) NOT NULL DEFAULT '',
  `numstateless` varchar(255) NOT NULL DEFAULT '',
  `nexerciseclub` varchar(255) NOT NULL DEFAULT '',
  `nolderlyclub` varchar(255) NOT NULL DEFAULT '',
  `ndisableclub` varchar(255) NOT NULL DEFAULT '',
  `nnumberoneclub` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`vid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of village
-- ----------------------------

-- ----------------------------
-- Table structure for women
-- ----------------------------
DROP TABLE IF EXISTS `women`;
CREATE TABLE `women` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `fptype` varchar(255) NOT NULL DEFAULT '',
  `nofpcause` varchar(255) NOT NULL DEFAULT '',
  `totalson` varchar(255) NOT NULL DEFAULT '',
  `numberson` varchar(255) NOT NULL DEFAULT '',
  `abortion` varchar(255) NOT NULL DEFAULT '',
  `stillbirth` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- ----------------------------
-- Records of women
-- ----------------------------

-- ----------------------------
-- Procedure structure for temp_hos_file_row_count
-- ----------------------------
DROP PROCEDURE IF EXISTS `temp_hos_file_row_count`;
DELIMITER ;;
CREATE DEFINER=`root`@`%` PROCEDURE `temp_hos_file_row_count`()
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE f_name VARCHAR(100);
  DECLARE cur CURSOR FOR 
    SELECT file_name FROM c_file;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  TRUNCATE TABLE temp_hos_file_row_count;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO f_name;
    IF done THEN 
      LEAVE read_loop;
    END IF;
    SET @s = CONCAT(
      'INSERT INTO temp_hos_file_row_count (hospcode, filename, row_count) ',
      'SELECT h.hospcode, ''', f_name, ''', COALESCE(t.cnt, 0) ',
      'FROM (SELECT DISTINCT hospcode FROM person WHERE hospcode IS NOT NULL) h ',
      'LEFT JOIN (SELECT hospcode, COUNT(*) AS cnt FROM `', f_name, '` GROUP BY hospcode) t ',
      'ON h.hospcode = t.hospcode'
    );
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END LOOP;
  CLOSE cur;
END
;;
DELIMITER ;

-- ----------------------------
-- Event structure for task_event
-- ----------------------------
DROP EVENT IF EXISTS `task_event`;
DELIMITER ;;
CREATE DEFINER=`root`@`%` EVENT `task_event` ON SCHEDULE EVERY 4 HOUR STARTS '2026-06-24 12:41:49' ON COMPLETION PRESERVE ENABLE DO CALL temp_hos_file_row_count()
;;
DELIMITER ;
