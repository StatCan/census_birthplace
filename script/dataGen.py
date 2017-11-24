#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import csv
import json
import bson
import msgpack
import struct

import os.path

import docopt

import configparser

config_file = 'converter.ini'
if os.path.isfile(config_file):
    ini_config = configparser.ConfigParser()
    ini_config.read(config_file)

    # Sources
    base_path        = ini_config.get('source','base_path')
    target_path      = ini_config.get('source','target_path')
    src_countries_f  = ini_config.get('source','src_countries')
    src_countries    = json.loads(open(src_countries_f).read())
    mapping_reader   = csv.reader(open(ini_config.get('source','mapping_reader'), 'rU'))
    data_reader      = csv.reader(open(ini_config.get('source','data_reader'), 'rU'))

bigly = False

mapping_data     = {}
data_data        = {}
next_id          = 0
sequential_ids   = {}
sequential_ids_r = {}

output_data      = {}

rownum = 0
for row in mapping_reader:
    if rownum < 1:
        rownum += 1
        continue
    else:
        if row[0] == '':
            continue
        if row[0] == '0.1':
            continue

        if row[0] not in sequential_ids:
            sequential_ids[row[0]] = next_id
            sequential_ids_r[next_id] = row[0]

        row_data = {}
        row_data['id']     = next_id
        row_data['level']    = row[1]
        row_data['eng_name'] = row[5].strip()
        row_data['fra_name'] = row[6].strip()
        row_data['code']     = row[2]

        #print row_data
        mapping_data[next_id] = row_data

        next_id += 1
        rownum += 1

rownum = 0
for row in data_reader:
    if rownum < 1:
        rownum += 1
        continue
    else:
        rownum += 1

        if row[2] == '0.1':
            continue

        if row[2] not in sequential_ids:
            print("ERR: Missing id for data row ["+str(rownum)+"] ["+row[0]+" "+row[1]+"] "+row[2])
            continue

        row_data = {}
        row_data['id']       = sequential_ids[row[2]]
        row_data['geocode']  = row[0]

        if row_data['geocode'] == '10999':
            row_data['geocode'] = '10-x-nie'
        if row_data['geocode'] == '11999':
            row_data['geocode'] = '11-x-nie'
        if row_data['geocode'] == '12999':
            row_data['geocode'] = '12-x-nie'
        if row_data['geocode'] == '13999':
            row_data['geocode'] = '13-x-nie'
        if row_data['geocode'] == '24999':
            row_data['geocode'] = '24-x-nie'
        if row_data['geocode'] == '35999':
            row_data['geocode'] = '35-x-nie'
        if row_data['geocode'] == '46999':
            row_data['geocode'] = '46-x-nie'
        if row_data['geocode'] == '47999':
            row_data['geocode'] = '47-x-nie'
        if row_data['geocode'] == '48999':
            row_data['geocode'] = '48-x-nie'
        if row_data['geocode'] == '59999':
            row_data['geocode'] = '59-x-nie'
        if row_data['geocode'] == '60999':
            row_data['geocode'] = '60-x-nie'
        if row_data['geocode'] == '61999':
            row_data['geocode'] = '61-x-nie'
        if row_data['geocode'] == '62999':
            row_data['geocode'] = '62-x-nie'

        row_data['period']   = row[1]
        row_data['total']    = int(row[3].strip())
        row_data['worker']   = int(row[4].strip())
        row_data['business'] = int(row[5].strip())
        row_data['nominee']  = int(row[6].strip())
        row_data['sponsor']  = int(row[7].strip())
        row_data['refugee']  = int(row[8].strip())
        row_data['bef_80']  = int(row[9].strip())
        row_data['other']  = int(row[10].strip())

        ## Check on the split
        #
        # Files per period
        # data_data['period']['geo']['id'] = row_data
        if row_data['period'] not in data_data:
            data_data[row_data['period']] = {}

        if row_data['geocode'] not in data_data[row_data['period']]:
            data_data[row_data['period']][row_data['geocode']] = {}

        if row_data['id'] not in data_data[row_data['period']][row_data['geocode']]:
            data_data[row_data['period']][row_data['geocode']][row_data['id']] = {}

        data_data[row_data['period']][row_data['geocode']][row_data['id']] = row_data

for period in data_data:
    # Wipe and reset
    output_data['indexes'] = []
    output_data['indexes'].append({'type':'pob', 'data': []})
    output_data['indexes'].append({'type':'sgc', 'data': []})
    output_data['matrix'] = []
    for next_id in mapping_data:
        output_data['indexes'][0]['data'].append(mapping_data[next_id]['code'])
    for geo in sorted(data_data[period]):
        output_data['indexes'][1]['data'].append(geo)

    data_total    = []
    data_worker   = []
    data_business = []
    data_nominee  = []
    data_sponsor  = []
    data_refugee  = []
    data_bef_80  = []
    data_other   = []

    matrix_number = 0
    for next_id in mapping_data:
        matrix_line = []
        for geo in sorted(data_data[period]):

            matrix_line.append(matrix_number)
            matrix_number += 1

            if next_id not in data_data[period][geo]:
                data_total.append(0)
                data_worker.append(0)
                data_business.append(0)
                data_nominee.append(0)
                data_sponsor.append(0)

                data_refugee.append(0)
                data_bef_80.append(0)
                data_other.append(0)
            else:
                data = data_data[period][geo][next_id]
                data_total.append(data['total'])
                data_worker.append(data['worker'])
                data_business.append(data['business'])
                data_nominee.append(data['nominee'])
                data_sponsor.append(data['sponsor'])

                data_refugee.append(data['refugee'])
                data_bef_80.append(data['bef_80'])
                data_other.append(data['other'])

        output_data['matrix'].append(matrix_line)

    output_data['values']   = {}
    output_data['values']['total']    = data_total
    output_data['values']['worker']   = data_worker
    output_data['values']['business'] = data_business
    output_data['values']['nominee']  = data_nominee
    output_data['values']['sponsor']  = data_sponsor

    output_data['values']['refugee']  = data_refugee
    output_data['values']['bef_80']  = data_bef_80
    output_data['values']['other']  = data_other


    if bigly:
        with open(base_path+'\census_birthplace_'+period+'.json', 'w') as outfile:
            outfile.write(json.dumps(output_data, sort_keys=True, indent=4, separators=(',', ': ')))
        
    else:
        # JSON
        with open(base_path+'\census_birthplace_'+period+'.json', 'w') as outfile:
            outfile.write(json.dumps(output_data, separators=(',', ': ')))

        ## BSON
        #with open('census_pob_'+period+'.bson', 'wb') as outfile:
        #    outfile.write(bson.dumps(output_data))

        # MSGPACK
        #with open('census_pob_'+period+'.msgpack', 'wb') as outfile:
        #    outfile.write(msgpack.packb(output_data))



#####
# Vett the countries file
# For each mapped location
for sequential_id in mapping_data:
    is_region = False
    is_country = False
    is_continent = False
    #print('===== '+mapping_data[sequential_id]['code'])

    # Check to see if it's a continent
    for continent in src_countries['continents']:
        if mapping_data[sequential_id]['code'] == continent['contId']:
            #print("= rid:"+region['rId'])
            is_continent = True
            #break

    # Check to see if it's a region
    for region in src_countries['regions']:
        if mapping_data[sequential_id]['code'] == region['rId']:
            #print("= rid:"+region['rId'])
            is_region = True
            #break

    # If it's not a region    
    if is_region == False and is_continent == False:
        # Check to see if it's a country
        for country in src_countries['countries']:
            if mapping_data[sequential_id]['code'] == country['cId']:
                #print("= cid:"+country['cId'])
                is_country = True
                #break

        # if it's not a country either...
        if is_country == False:
            # Flag an error
            print("ERR: missing country/region in countries.json ["+mapping_data[sequential_id]['code']+"]")

