#!/usr/bin/env python
# coding: utf-8

# In[5]:


import pandas as pd
import os
import shutil


# In[2]:


# create data for positive sample

FILE_PATH = "chestxray/metadata.csv"
IMAGES_PATH = "chestxray/images"


# In[3]:


df = pd.read_csv(FILE_PATH)
print(df.shape)


# In[4]:


df.head()


# In[6]:


TARGET_DIR = "Dataset/Covid"

if not os.path.exists(TARGET_DIR):
    os.mkdir(TARGET_DIR)
    print("Covid Folder Created")


# In[15]:


cnt = 0

for (i, row) in df.iterrows() :
    if row["finding"]== "COVID-19" and row["view"]=="PA":
        filename = row["filename"]
        image_path = os.path.join(IMAGES_PATH, filename)
        image_copy_path = os.path.join(TARGET_DIR, filename)
        shutil.copy2(image_path, image_copy_path)
        #print("moving image ", cnt)
        cnt+=1
#print(cnt)


# In[16]:


#Sampling of normal images from Kaggle dataset

import random
KAGGLE_FILE_PATH = "chestxray_kaggle/train/NORMAL"
TARGET_NORMAL_DIR = "Dataset/Normal"


# In[21]:


images_names = os.listdir(KAGGLE_FILE_PATH)
random.shuffle(images_names)


# In[23]:


cnt = 0
for i in range(0,142):
    image_name = images_names[i]
    image_path_normal = os.path.join(KAGGLE_FILE_PATH, image_name)
    target_path_normal = os.path.join(TARGET_NORMAL_DIR, image_name)
    shutil.copy(image_path_normal, target_path_normal)
    cnt+=1
    
#print(cnt)


# In[ ]:




